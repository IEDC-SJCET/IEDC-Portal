import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  eventAttendance,
  eventRegistrations,
  events,
  pointsLog,
  studentProfiles,
  users,
} from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { awardPoints } from "@/lib/points";
import { getEventAccess } from "@/lib/event-access";
import { isUUID } from "@/lib/request";

const manualAttendanceSchema = z.object({
  studentId: z.string().refine(isUUID, "Invalid student id"),
  present: z.boolean(),
});

/** Attendance may be corrected while the event runs and after it has finished. */
const EDITABLE_STATUSES = ["published", "ongoing", "completed"];

// PATCH — Execom manually marks a registered student present or absent

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  if (!isUUID(eventId)) {
    return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only Execom (and the Nodal Officer) — volunteers can scan, but never override.
  const access = await getEventAccess(session, eventId);
  if (!access.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = manualAttendanceSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { studentId, present } = parsed.data;

  try {
    const [event] = await db
      .select({
        status: events.status,
        participationPoints: events.participationPoints,
        volunteerPoints: events.volunteerPoints,
      })
      .from(events)
      .where(eq(events.id, eventId));

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    if (!EDITABLE_STATUSES.includes(event.status ?? "")) {
      return NextResponse.json(
        { error: "Attendance can't be changed for a draft or cancelled event" },
        { status: 400 }
      );
    }

    const [registration] = await db
      .select({ role: eventRegistrations.role })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.studentId, studentId),
          isNull(eventRegistrations.cancelledAt)
        )
      );

    if (!registration) {
      return NextResponse.json(
        { error: "Student is not registered for this event" },
        { status: 404 }
      );
    }

    if (present) {
      // The unique (event, student) index makes this idempotent against a concurrent scan.
      const inserted = await db
        .insert(eventAttendance)
        .values({ eventId, studentId, scannedBy: session.user.id })
        .onConflictDoNothing()
        .returning({ id: eventAttendance.id });

      if (inserted.length > 0) {
        // Same points rule as the QR scan: award once per activity per event.
        const activityType =
          registration.role === "volunteer" ? "event_volunteer" : "event_participation";
        const customPoints =
          activityType === "event_volunteer"
            ? (event.volunteerPoints ?? 20)
            : (event.participationPoints ?? 10);

        const [alreadyAwarded] = await db
          .select({ id: pointsLog.id })
          .from(pointsLog)
          .where(
            and(
              eq(pointsLog.studentId, studentId),
              eq(pointsLog.activityType, activityType),
              eq(pointsLog.referenceId, eventId)
            )
          );

        if (!alreadyAwarded) {
          await awardPoints({
            studentId,
            activityType,
            referenceId: eventId,
            referenceType: "event",
            awardedBy: session.user.id,
            customPoints,
          });
        }
      }
    } else {
      await db.transaction(async (tx) => {
        const deleted = await tx
          .delete(eventAttendance)
          .where(
            and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.studentId, studentId))
          )
          .returning({ id: eventAttendance.id });
        if (deleted.length === 0) return;

        // Participation points exist only because of attendance, so take them back.
        // Volunteer points belong to the volunteer assignment and are left alone.
        const revoked = await tx
          .delete(pointsLog)
          .where(
            and(
              eq(pointsLog.studentId, studentId),
              eq(pointsLog.activityType, "event_participation"),
              eq(pointsLog.referenceId, eventId)
            )
          )
          .returning({ points: pointsLog.points });

        const total = revoked.reduce((sum, row) => sum + row.points, 0);
        if (total === 0) return;

        const [profile] = await tx
          .update(studentProfiles)
          .set({
            totalPoints: sql`GREATEST(${studentProfiles.totalPoints} - ${total}, 0)`,
            updatedAt: new Date(),
          })
          .where(eq(studentProfiles.id, studentId))
          .returning({ userId: studentProfiles.userId });

        if (profile?.userId) {
          await tx
            .update(users)
            .set({
              points: sql`GREATEST(${users.points} - ${total}, 0)`,
              updatedAt: new Date(),
            })
            .where(eq(users.id, profile.userId));
        }
      });
    }

    return NextResponse.json({ success: true, studentId, attended: present });
  } catch (error) {
    console.error("Failed to update attendance manually:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}