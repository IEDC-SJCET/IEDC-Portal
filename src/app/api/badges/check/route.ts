import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { studentProfiles, badges } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { checkAndAwardBadges } from "@/lib/points";
import { isAdminRole } from "@/lib/roles";
import { isUUID } from "@/lib/request";

async function getSession() {
  return await auth.api.getSession({ headers: await headers() });
}

// POST /api/badges/check — manually re-evaluate badges
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let studentId: string | null = null;

  if (session.user.role === "student") {
    // Re-evaluate for the current student
    const [profile] = await db
      .select({ id: studentProfiles.id })
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id));

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    studentId = profile.id;
  } else if (isAdminRole(session.user.role)) {
    // Execom can trigger for a specific student
    const body = await request.json().catch(() => ({}));
    const targetStudentId = (body as Record<string, unknown>).studentId as string | undefined;

    if (!targetStudentId) {
      return NextResponse.json(
        { error: "studentId required for execom badge check" },
        { status: 400 }
      );
    }
    if (!isUUID(targetStudentId)) {
      return NextResponse.json({ error: "Invalid studentId format" }, { status: 400 });
    }
    studentId = targetStudentId;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const newlyAwarded = await checkAndAwardBadges(studentId);

  // Fetch badge details for newly awarded
  let awardedBadges: Array<{ id: string; name: string; icon: string | null }> = [];
  if (newlyAwarded.length > 0) {
    awardedBadges = await db
      .select({ id: badges.id, name: badges.name, icon: badges.icon })
      .from(badges)
      .where(eq(badges.isActive, true));

    awardedBadges = awardedBadges.filter((b) => newlyAwarded.includes(b.id));
  }

  return NextResponse.json({
    checked: true,
    newlyAwarded: awardedBadges,
  });
}