import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { eventAttendance, eventRegistrations, studentProfiles, events, pointsLog } from "@/db/schema";
import { eq, and, isNull, ilike } from "drizzle-orm";
import { verifyDynamicQRPayload, decryptPayload } from "@/lib/qr";
import { awardPoints } from "@/lib/points";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/roles";

const CIPHER_PREFIX = "IEDC:";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { qrData, eventId, iecdId } = await request.json();

  const userRole = (session.user as Record<string, unknown>).role as string;

  let hasAccess = isAdminRole(userRole);

  if (!hasAccess) {
    const [profile] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id));

    if (profile) {
      const [volunteerReg] = await db
        .select()
        .from(eventRegistrations)
        .where(
          and(
            eq(eventRegistrations.eventId, eventId),
            eq(eventRegistrations.studentId, profile.id),
            eq(eventRegistrations.role, "volunteer"),
            isNull(eventRegistrations.cancelledAt)
          )
        );
      if (volunteerReg) {
        hasAccess = true;
      }
    }
  }

  if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let student: typeof studentProfiles.$inferSelect | undefined;
  const isManual = typeof iecdId === "string" && iecdId.trim().length > 0;

  if (isManual) {
    const targetIecdId = iecdId.trim();
    const [foundStudent] = await db
      .select()
      .from(studentProfiles)
      .where(ilike(studentProfiles.iecdId, targetIecdId));

    if (!foundStudent) {
      return NextResponse.json({ success: false, message: "Student not found with this IEDC ID" }, { status: 404 });
    }
    student = foundStudent;
  } else {
    if (!qrData) {
      return NextResponse.json({ success: false, message: "No QR data or IEDC ID provided" }, { status: 400 });
    }

    let parsed: { iid?: string };
    try {
      if (typeof qrData === "string" && qrData.startsWith(CIPHER_PREFIX)) {
        const decrypted = decryptPayload(qrData.slice(CIPHER_PREFIX.length));
        if (!decrypted) {
          return NextResponse.json({ success: false, message: "Invalid QR code — decryption failed" }, { status: 400 });
        }
        parsed = JSON.parse(decrypted);
      } else {
        parsed = JSON.parse(qrData);
      }
    } catch {
      return NextResponse.json({ success: false, message: "Invalid QR code format" }, { status: 400 });
    }

    if (!parsed.iid) {
      return NextResponse.json({ success: false, message: "Invalid QR code" }, { status: 400 });
    }

    const [foundStudent] = await db
      .select()
      .from(studentProfiles)
      .where(ilike(studentProfiles.iecdId, parsed.iid));

    if (!foundStudent) {
      return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
    }

    // Verify time-windowed HMAC
    const { valid } = verifyDynamicQRPayload(qrData, foundStudent.qrHmacSecret);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired QR code" },
        { status: 400 }
      );
    }

    student = foundStudent;
  }

  if (!student) {
    return NextResponse.json({ success: false, message: "Student not found" }, { status: 404 });
  }

  // Check event
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event || !["published", "ongoing"].includes(event.status!)) {
    return NextResponse.json({ success: false, message: "Event not active" }, { status: 400 });
  }

  // Strictly verify that the student has successfully registered for this event
  const [registration] = await db
    .select({
      id: eventRegistrations.id,
      role: eventRegistrations.role,
    })
    .from(eventRegistrations)
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        eq(eventRegistrations.studentId, student.id),
        isNull(eventRegistrations.cancelledAt)
      )
    );

  if (!registration) {
    return NextResponse.json(
      {
        success: false,
        message: `${student.name} is not registered for this event`,
        studentName: student.name,
        iecdId: student.iecdId,
      },
      { status: 400 }
    );
  }

  // Check duplicate attendance
  const existing = await db
    .select({ id: eventAttendance.id })
    .from(eventAttendance)
    .where(and(eq(eventAttendance.eventId, eventId), eq(eventAttendance.studentId, student.id)));

  if (existing.length > 0) {
    return NextResponse.json({
      success: false,
      message: `${student.name} already marked present`,
      studentName: student.name,
      iecdId: student.iecdId,
    });
  }

  await db.insert(eventAttendance).values({
    eventId,
    studentId: student.id,
    scannedBy: session.user.id,
  });

  const activityType =
    registration.role === "volunteer"
      ? "event_volunteer"
      : "event_participation";

  const customPoints =
    activityType === "event_volunteer"
      ? (event.volunteerPoints ?? 20)
      : (event.participationPoints ?? 10);

  // Volunteers are already awarded when they are assigned to the event, so only
  // award if this student has no points logged for this activity on this event.
  const [alreadyAwarded] = await db
    .select({ id: pointsLog.id })
    .from(pointsLog)
    .where(
      and(
        eq(pointsLog.studentId, student.id),
        eq(pointsLog.activityType, activityType),
        eq(pointsLog.referenceId, eventId)
      )
    );

  if (!alreadyAwarded) {
    await awardPoints({
      studentId: student.id,
      activityType,
      referenceId: eventId,
      referenceType: "event",
      awardedBy: session.user.id,
      customPoints,
    });
  }

  return NextResponse.json({
    success: true,
    studentName: student.name,
    studentPhoto: student.photoUrl,
    iecdId: student.iecdId,
    registered: true,
    role: registration.role,
    message: isManual ? `✅ ${student.name} marked present (Manual)` : `✅ ${student.name} marked present`,
  });
}