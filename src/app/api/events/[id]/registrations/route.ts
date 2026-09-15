import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { eventRegistrations, studentProfiles, eventAttendance, users } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/roles";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams.id;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  let allowed = role === "faculty" || isAdminRole(role);

  if (!allowed) {
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
            eq(eventRegistrations.eventId, id),
            eq(eventRegistrations.studentId, profile.id),
            eq(eventRegistrations.role, "volunteer"),
            isNull(eventRegistrations.cancelledAt)
          )
        );
      if (volunteerReg) {
        allowed = true;
      }
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const registrations = await db
      .select({
        id: eventRegistrations.id,
        role: eventRegistrations.role,
        registeredAt: eventRegistrations.registeredAt,
        student: {
          id: studentProfiles.id,
          name: studentProfiles.name,
          admissionNumber: studentProfiles.admissionNumber,
          department: studentProfiles.department,
          batch: studentProfiles.batch,
          iecdId: studentProfiles.iecdId,
          phone: studentProfiles.phone,
          // Portal role behind the profile, so exports can leave staff off the roster.
          userRole: users.role,
        },
        attended: eventAttendance.id,
      })
      .from(eventRegistrations)
      .innerJoin(studentProfiles, eq(eventRegistrations.studentId, studentProfiles.id))
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .leftJoin(
        eventAttendance,
        and(
          eq(eventAttendance.eventId, eventRegistrations.eventId),
          eq(eventAttendance.studentId, studentProfiles.id)
        )
      )
      .where(eq(eventRegistrations.eventId, id));

    return NextResponse.json({
      registrations: registrations.map((r) => ({
        ...r,
        attended: !!r.attended,
      })),
    });
  } catch (error) {
    console.error("Failed to fetch event registrations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
