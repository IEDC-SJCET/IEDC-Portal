import { db } from "@/db";
import { studentProfiles, pointsLog, users } from "@/db/schema";
import { desc, eq, gte, and, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { parsePagination } from "@/lib/request";
import {
  getRedis,
  leaderboardKey,
  LEADERBOARD_TTL,
  periodStart,
  type LeaderboardScope,
} from "@/lib/redis";

interface LeaderboardEntry {
  rank: number;
  iecdId: string;
  name: string;
  department: string;
  photoUrl: string | null;
  points: number;
}

async function fetchFromDb(
  scope: LeaderboardScope,
  limit: number,
  offset: number
): Promise<LeaderboardEntry[]> {
  if (scope === "overall") {
    const rows = await db
      .select({
        name: studentProfiles.name,
        department: studentProfiles.department,
        photoUrl: studentProfiles.photoUrl,
        iecdId: studentProfiles.iecdId,
        totalPoints: studentProfiles.totalPoints,
      })
      .from(studentProfiles)
      .innerJoin(users, eq(users.id, studentProfiles.userId))
      .where(
        and(eq(studentProfiles.isDeleted, false), eq(users.role, "student"))
      )
      .orderBy(desc(studentProfiles.totalPoints))
      .limit(limit)
      .offset(offset);

    return rows.map((r, i) => ({
      rank: offset + i + 1,
      iecdId: r.iecdId,
      name: r.name,
      department: r.department,
      photoUrl: r.photoUrl,
      points: r.totalPoints ?? 0,
    }));
  }

  // Monthly / Weekly — aggregate from pointsLog
  const start = periodStart(scope)!;

  const rows = await db
    .select({
      name: studentProfiles.name,
      department: studentProfiles.department,
      photoUrl: studentProfiles.photoUrl,
      iecdId: studentProfiles.iecdId,
      periodPoints: sql<number>`COALESCE(SUM(${pointsLog.points}), 0)`,
    })
    .from(studentProfiles)
    .innerJoin(users, eq(users.id, studentProfiles.userId))
    .leftJoin(
      pointsLog,
      and(
        eq(pointsLog.studentId, studentProfiles.id),
        gte(pointsLog.awardedAt, start)
      )
    )
    .where(
      and(eq(studentProfiles.isDeleted, false), eq(users.role, "student"))
    )
    .groupBy(
      studentProfiles.iecdId,
      studentProfiles.name,
      studentProfiles.department,
      studentProfiles.photoUrl
    )
    .orderBy(desc(sql<number>`COALESCE(SUM(${pointsLog.points}), 0)`))
    .limit(limit)
    .offset(offset);

  return rows.map((r, i) => ({
    rank: offset + i + 1,
    iecdId: r.iecdId,
    name: r.name,
    department: r.department,
    photoUrl: r.photoUrl,
    points: r.periodPoints,
  }));
}

/**
 * Postgres fallback cached in the Next.js Data Cache with the same TTLs as Redis,
 * so a missing or cold Redis doesn't send every viewer to the database. The
 * leaderboard is public and identical for everyone. `periodKey` is only part of
 * the cache key, so weekly/monthly boards roll over at the period boundary.
 */
const cachedFetchFromDb = Object.fromEntries(
  (Object.keys(LEADERBOARD_TTL) as LeaderboardScope[]).map((scope) => [
    scope,
    unstable_cache(
      (_periodKey: string, limit: number, offset: number) => fetchFromDb(scope, limit, offset),
      ["leaderboard", scope],
      { tags: ["leaderboard"], revalidate: LEADERBOARD_TTL[scope] }
    ),
  ])
) as Record<LeaderboardScope, (periodKey: string, limit: number, offset: number) => Promise<LeaderboardEntry[]>>;

/** Try to read a page from Redis sorted set. Returns null on miss. */
async function fetchFromRedis(
  scope: LeaderboardScope,
  limit: number,
  offset: number
): Promise<LeaderboardEntry[] | null> {
  const redis = getRedis();
  if (!redis) return null;

  const key = leaderboardKey(scope);

  // ZREVRANGE with scores — member format is JSON-stringified entry
  const raw = await redis.zrange(key, offset, offset + limit - 1, {
    rev: true,
    withScores: true,
  });

  if (!raw || raw.length === 0) return null;

  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const member = raw[i] as string;
    const score = raw[i + 1] as number;
    try {
      const parsed = JSON.parse(member) as Omit<LeaderboardEntry, "rank" | "points">;
      entries.push({ ...parsed, rank: offset + entries.length + 1, points: score });
    } catch {
      // corrupt member — skip and let it be rebuilt
      return null;
    }
  }

  return entries.length > 0 ? entries : null;
}

async function populateRedis(scope: LeaderboardScope): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const key = leaderboardKey(scope);
  const ttl = LEADERBOARD_TTL[scope];

  // Fetch top 200 to populate the set
  const rows = await fetchFromDb(scope, 200, 0);
  if (rows.length === 0) return;

  const members = rows.map((r) => ({
    score: r.points,
    member: JSON.stringify({
      iecdId: r.iecdId,
      name: r.name,
      department: r.department,
      photoUrl: r.photoUrl,
    }),
  }));

  if (members.length === 0) return;

  const [first, ...rest] = members;
  await redis.zadd(key, first, ...rest);
  await redis.expire(key, ttl);
}


export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawScope = searchParams.get("scope") ?? "overall";
  const scope: LeaderboardScope =
    rawScope === "monthly" || rawScope === "weekly" ? rawScope : "overall";
  const { page, limit } = parsePagination(searchParams, 50, 200);
  const offset = page * limit;

  // 1. Try Redis
  let cached = await fetchFromRedis(scope, limit, offset);

  if (!cached) {
    // 2. Miss — populate Redis and read from Postgres
    populateRedis(scope).catch(console.error); // async, fire-and-forget
    cached = await cachedFetchFromDb[scope](leaderboardKey(scope), limit, offset);
  }

  return NextResponse.json({
    leaderboard: cached,
    scope,
    page,
    limit,
  });
}