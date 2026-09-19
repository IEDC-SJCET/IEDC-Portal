import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { eventRegistrations, events, studentProfiles } from "@/db/schema";
import { eq, and, count, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/roles";

async function getSession() {
  return await auth.api.getSession({ headers: await headers() });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const body = await request.json().catch(() => ({}));

  const requestedRole = (body.role as string | undefined) || "participant";
  if (requestedRole !== "participant") {
    return NextResponse.json(
      { error: "Volunteers are assigned by the Execom team, not self-selected." },
      { status: 403 }
    );
  }

  // Get student profile
  let [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id));

  if (!profile) {
    const userRole = (session.user as Record<string, unknown>).role as string;
    if (isAdminRole(userRole)) {
      try {
        const { generateIEDCId } = await import("@/lib/iedc-id");
        const { generateQRSecret, generateQRDataURL } = await import("@/lib/qr");

        const qrSecret = generateQRSecret();
        const iecdId = await generateIEDCId("EX", new Date().getFullYear());

        const [newProfile] = await db
          .insert(studentProfiles)
          .values({
            userId: session.user.id,
            iecdId,
            name: session.user.name || "Execom User",
            admissionNumber: `EXE-${session.user.id.slice(0, 8)}`,
            department: "EX",
            batch: "EXECOM",
            phone: "",
            qrHmacSecret: qrSecret,
          })
          .returning();

        const qrCodeUrl = await generateQRDataURL(newProfile.id, iecdId, qrSecret);

        const [updatedProfile] = await db
          .update(studentProfiles)
          .set({ qrCodeUrl })
          .where(eq(studentProfiles.id, newProfile.id))
          .returning();

        profile = updatedProfile;
      } catch (error) {
        console.error("Failed to auto-create profile for Execom user:", error);
        return NextResponse.json(
          { error: "Failed to create student profile for Execom user" },
          { status: 500 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 }
      );
    }
  }

  // Check event exists and is published
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event || event.status !== "published") {
    return NextResponse.json(
      { error: "Event not available for registration" },
      { status: 400 }
    );
  }

  // Check registration limit
  if (event.registrationLimit) {
    const regCount = await db
      .select({ count: count() })
      .from(eventRegistrations)
      .where(
        and(
          eq(eventRegistrations.eventId, eventId),
          isNull(eventRegistrations.cancelledAt)
        )
      );

    if (regCount[0].count >= event.registrationLimit) {
      return NextResponse.json({ error: "Event is full" }, { status: 400 });
    }
  }

  // Check deadline
  if (event.registrationDeadline && new Date() > event.registrationDeadline) {
    return NextResponse.json(
      { error: "Registration deadline has passed" },
      { status: 400 }
    );
  }

  // Check existing registration
  const [existing] = await db
    .select()
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.studentId, profile.id)
      )
    );

  if (existing && !existing.cancelledAt) {
    return NextResponse.json(
      { error: "Already registered for this event" },
      { status: 409 }
    );
  }

  let registration;
  if (existing) {
    [registration] = await db
      .update(eventRegistrations)
      .set({
        role: "participant",
        registeredAt: new Date(),
        cancellationReason: null,
        cancelledAt: null,
      })
      .where(eq(eventRegistrations.id, existing.id))
      .returning();
  } else {
    [registration] = await db
      .insert(eventRegistrations)
      .values({
        eventId,
        studentId: profile.id,
        role: "participant",
      })
      .returning();
  }

  return NextResponse.json(registration, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;

  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const isCompleted =
    event.status === "completed" ||
    event.status === "cancelled" ||
    (event.endDatetime ? new Date() > new Date(event.endDatetime) : false);

  if (isCompleted) {
    return NextResponse.json(
      { error: "Registration cannot be cancelled after an event is completed" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { reason } = body as { reason?: string };

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json(
      { error: "Cancellation reason is required" },
      { status: 400 }
    );
  }

  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id));

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const [activeReg] = await db
    .select()
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.studentId, profile.id),
        isNull(eventRegistrations.cancelledAt)
      )
    );

  if (!activeReg) {
    return NextResponse.json(
      { error: "Active registration not found" },
      { status: 404 }
    );
  }

  await db
    .update(eventRegistrations)
    .set({
      cancellationReason: reason.trim(),
      cancelledAt: new Date(),
    })
    .where(eq(eventRegistrations.id, activeReg.id));

  return NextResponse.json({ message: "Registration cancelled" });
}