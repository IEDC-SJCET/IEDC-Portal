import { db } from "@/db";
import {
  pointsLog,
  studentProfiles,
  pointRules,
  badges,
  studentBadges,
  eventAttendance,
  eventRegistrations,
  projects,
  users,
} from "@/db/schema";
import { eq, sql, and, count, desc, asc } from "drizzle-orm";

type ActivityType =
  | "event_participation"
  | "event_volunteer"
  | "event_coordinator"
  | "project_submission"
  | "competition_winner"
  | "workshop_completion"
  | "startup_idea"
  | "manual_award";

export type BadgeCriteria =
  | { type: "points"; threshold: number }
  | { type: "event_count"; min: number }
  | { type: "project_count"; min: number }
  | { type: "volunteer_count"; min: number }
  | { type: "streak"; min: number };

// POINTS
export async function awardPoints(params: {
  studentId: string;
  activityType: ActivityType;
  referenceId?: string;
  referenceType?: string;
  awardedBy?: string;
  note?: string;
  customPoints?: number;
}): Promise<number> {
  const {
    studentId,
    activityType,
    referenceId,
    referenceType,
    awardedBy,
    note,
    customPoints,
  } = params;

  // Get configured points for this activity type
  let points = customPoints;
  if (points === undefined || points === null) {
    const rules = await db
      .select()
      .from(pointRules)
      .where(eq(pointRules.activityType, activityType));
    points = rules.length > 0 ? rules[0].points : getDefaultPoints(activityType);
  }

  // Log points
  await db.insert(pointsLog).values({
    studentId,
    points,
    activityType,
    referenceId,
    referenceType,
    awardedBy,
    note,
  });

  // Update student total
  await db
    .update(studentProfiles)
    .set({
      totalPoints: sql`${studentProfiles.totalPoints} + ${points}`,
      updatedAt: new Date(),
    })
    .where(eq(studentProfiles.id, studentId));

  // Mirror the total onto the user row
  const [profile] = await db
    .select({ userId: studentProfiles.userId })
    .from(studentProfiles)
    .where(eq(studentProfiles.id, studentId));
  if (profile?.userId) {
    await db
      .update(users)
      .set({
        points: sql`${users.points} + ${points}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, profile.userId));
  }

  // Check badges (async, don't await)
  checkAndAwardBadges(studentId).catch(console.error);

  return points;
}

function getDefaultPoints(activityType: ActivityType): number {
  const defaults: Record<ActivityType, number> = {
    event_participation: 10,
    event_volunteer: 20,
    event_coordinator: 30,
    project_submission: 25,
    competition_winner: 50,
    workshop_completion: 15,
    startup_idea: 40,
    manual_award: 10,
  };
  return defaults[activityType] || 10;
}

// BADGE ENGINE

/**
 * Lazy metric cache — only fetches data from DB when a criteria type
 */
interface MetricCache {
  eventCount?: number;
  projectCount?: number;
  volunteerCount?: number;
  streak?: number;
}

async function getEventCount(studentId: string, cache: MetricCache): Promise<number> {
  if (cache.eventCount !== undefined) return cache.eventCount;
  const [result] = await db
    .select({ count: count() })
    .from(eventAttendance)
    .where(eq(eventAttendance.studentId, studentId));
  cache.eventCount = result?.count ?? 0;
  return cache.eventCount;
}

async function getProjectCount(studentId: string, cache: MetricCache): Promise<number> {
  if (cache.projectCount !== undefined) return cache.projectCount;
  const [result] = await db
    .select({ count: count() })
    .from(projects)
    .where(and(eq(projects.submittedBy, studentId), eq(projects.status, "approved")));
  cache.projectCount = result?.count ?? 0;
  return cache.projectCount;
}

async function getVolunteerCount(studentId: string, cache: MetricCache): Promise<number> {
  if (cache.volunteerCount !== undefined) return cache.volunteerCount;
  const [result] = await db
    .select({ count: count() })
    .from(eventRegistrations)
    .where(
      and(eq(eventRegistrations.studentId, studentId), eq(eventRegistrations.role, "volunteer"))
    );
  cache.volunteerCount = result?.count ?? 0;
  return cache.volunteerCount;
}

async function getStreak(studentId: string, cache: MetricCache): Promise<number> {
  if (cache.streak !== undefined) return cache.streak;

  // Get all attendance records ordered by scan date descending
  const records = await db
    .select({ eventId: eventAttendance.eventId, scannedAt: eventAttendance.scannedAt })
    .from(eventAttendance)
    .where(eq(eventAttendance.studentId, studentId))
    .orderBy(desc(eventAttendance.scannedAt));

  if (records.length === 0) {
    cache.streak = 0;
    return 0;
  }

  // Count consecutive attendance — each attendance record counts as one
  // "consecutive" means no gap > 60 days between subsequent events
  let streak = 1;
  const MAX_GAP_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

  for (let i = 1; i < records.length; i++) {
    const current = records[i].scannedAt;
    const previous = records[i - 1].scannedAt;
    if (!current || !previous) break;

    const gap = previous.getTime() - current.getTime();
    if (gap <= MAX_GAP_MS) {
      streak++;
    } else {
      break;
    }
  }

  cache.streak = streak;
  return streak;
}

/**
 * Evaluates a single badge criteria against a student's metrics.
 */
async function evaluateCriteria(
  studentId: string,
  totalPoints: number,
  criteria: BadgeCriteria,
  cache: MetricCache
): Promise<boolean> {
  switch (criteria.type) {
    case "points":
      return totalPoints >= criteria.threshold;
    case "event_count":
      return (await getEventCount(studentId, cache)) >= criteria.min;
    case "project_count":
      return (await getProjectCount(studentId, cache)) >= criteria.min;
    case "volunteer_count":
      return (await getVolunteerCount(studentId, cache)) >= criteria.min;
    case "streak":
      return (await getStreak(studentId, cache)) >= criteria.min;
    default:
      return false;
  }
}

/**
 * Check all active badges and award any the student qualifies for.
 * Returns the list of newly awarded badge IDs.
 */
export async function checkAndAwardBadges(studentId: string): Promise<string[]> {
  const [student] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.id, studentId));

  if (!student) return [];

  const allBadges = await db
    .select()
    .from(badges)
    .where(eq(badges.isActive, true));

  const earnedBadges = await db
    .select()
    .from(studentBadges)
    .where(eq(studentBadges.studentId, studentId));

  const earnedIds = new Set(earnedBadges.map((b) => b.badgeId));
  const cache: MetricCache = {};
  const newlyAwarded: string[] = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;

    const criteria = badge.criteria as BadgeCriteria;
    if (!criteria?.type) continue;

    const eligible = await evaluateCriteria(
      studentId,
      student.totalPoints ?? 0,
      criteria,
      cache
    );

    if (eligible) {
      try {
        await db
          .insert(studentBadges)
          .values({ studentId, badgeId: badge.id })
          .onConflictDoNothing();
        newlyAwarded.push(badge.id);
      } catch {
        // Race condition — another process already awarded it
      }
    }
  }

  return newlyAwarded;
}