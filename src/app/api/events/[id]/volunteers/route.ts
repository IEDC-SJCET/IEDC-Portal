import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  eventRegistrations,
  events,
  pointsLog,
  studentProfiles,
  users,
} from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { awardPoints } from "@/lib/points";
import { getEventAccess } from "@/lib/event-access";
import { z } from "zod";

const addVolunteerSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

async function getSession() {
  return await auth.api.getSession({ headers: await headers() });
}

/** Active volunteers for an event, joined with their user + profile details. */
async function listVolunteers(eventId: string) {
  const rows = await db
    .select({
      registrationId: eventRegistrations.id,
      studentId: studentProfiles.id,
      name: studentProfiles.name,
      email: users.email,
      iecdId: studentProfiles.iecdId,
      department: studentProfiles.department,
      batch: studentProfiles.batch,
      addedAt: eventRegistrations.registeredAt,
    })
    .from(eventRegistrations)
    .innerJoin(studentProfiles, eq(eventRegistrations.studentId, studentProfiles.id))
    .innerJoin(users, eq(studentProfiles.userId, users.id))
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.role, "volunteer"),
        isNull(eventRegistrations.cancelledAt)
      )
    )
    .orderBy(studentProfiles.name);

  return rows;
}

// ============================================================
// GET — list the volunteers assigned to this event
// ============================================================

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getEventAccess(session, eventId);
  if (!access.canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    return NextResponse.json({ volunteers: await listVolunteers(eventId) });
  } catch (error) {
    console.error("Failed to list event volunteers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================
// POST — assign a logged-in student as a volunteer, by email
// ============================================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getEventAccess(session, eventId);
  if (!access.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = addVolunteerSchema.safeParse(body);
  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message || "Enter a valid email address";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event || event.isDeleted) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  try {
    // The person must already have an account and a student profile — this is
    // an access grant, not an invitation.
    const [target] = await db
      .select({
        studentId: studentProfiles.id,
        name: studentProfiles.name,
        email: users.email,
      })
      .from(users)
      .innerJoin(studentProfiles, eq(studentProfiles.userId, users.id))
      .where(sql`LOWER(${users.email}) = ${email}`);

    if (!target) {
      return NextResponse.json(
        {
          error:
            "No portal account with a student profile was found for that email. Ask them to sign in and complete onboarding first.",
        },
        { status: 404 }
      );
    }

    const [existing] = await db
      .select()
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.studentId, target.studentId)
        )
      );

    if (existing && existing.role === "volunteer" && !existing.cancelledAt) {
      return NextResponse.json(
        { error: `${target.name} is already a volunteer for this event` },
        { status: 409 }
      );
    }

    if (existing) {
      // Promote an existing (or previously cancelled) registration to volunteer.
      await db
        .update(eventRegistrations)
        .set({
          role: "volunteer",
          cancellationReason: null,
          cancelledAt: null,
        })
        .where(eq(eventRegistrations.id, existing.id));
    } else {
      await db.insert(eventRegistrations).values({
        eventId,
        studentId: target.studentId,
        role: "volunteer",
      });
    }

    // Award volunteer points once per student per event.
    const [alreadyAwarded] = await db
      .select({ id: pointsLog.id, points: pointsLog.points })
      .from(pointsLog)
      .where(
        and(
          eq(pointsLog.studentId, target.studentId),
          eq(pointsLog.activityType, "event_volunteer"),
          eq(pointsLog.referenceId, eventId)
        )
      );

    if (!alreadyAwarded || alreadyAwarded.points <= 0) {
      if (alreadyAwarded && alreadyAwarded.points <= 0) {
        await db.delete(pointsLog).where(eq(pointsLog.id, alreadyAwarded.id));
      }
      const volPoints = event.volunteerPoints && event.volunteerPoints > 0 ? event.volunteerPoints : 20;
      await awardPoints({
        studentId: target.studentId,
        activityType: "event_volunteer",
        referenceId: eventId,
        referenceType: "event",
        customPoints: volPoints,
        note: `Volunteered for event: ${event.title}`,
        awardedBy: session.user.id,
      });
    }

    return NextResponse.json(
      {
        message: `${target.name} added as a volunteer`,
        volunteers: await listVolunteers(eventId),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to add event volunteer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ============================================================
// DELETE — revoke a volunteer's access to this event
// ============================================================

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const access = await getEventAccess(session, eventId);
  if (!access.canManage) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  try {
    const deleted = await db
      .delete(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          eq(eventRegistrations.studentId, studentId),
          eq(eventRegistrations.role, "volunteer")
        )
      )
      .returning({ id: eventRegistrations.id });

    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "Volunteer assignment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Volunteer removed",
      volunteers: await listVolunteers(eventId),
    });
  } catch (error) {
    console.error("Failed to remove event volunteer:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
