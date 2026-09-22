import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { pointsLog, studentProfiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { parsePagination } from "@/lib/request";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const { page, limit } = parsePagination(searchParams, 20);

  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id));

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const history = await db
    .select({
      activityType: pointsLog.activityType,
      points: pointsLog.points,
      referenceType: pointsLog.referenceType,
      awardedAt: pointsLog.awardedAt,
      note: pointsLog.note,
    })
    .from(pointsLog)
    .where(eq(pointsLog.studentId, profile.id))
    .orderBy(desc(pointsLog.awardedAt))
    .limit(limit)
    .offset(page * limit);

  return NextResponse.json({ history, totalPoints: profile.totalPoints });
}
