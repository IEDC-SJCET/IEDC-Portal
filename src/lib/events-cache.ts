import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/db";
import { events } from "@/db/schema";
import { and, count, desc, eq, gte, inArray, ne, notInArray, or } from "drizzle-orm";

export const EVENTS_CACHE_TAG = "events";

const EVENTS_CACHE_REVALIDATE_SECONDS = 60;

type EventRow = typeof events.$inferSelect;
type EventStatus = NonNullable<EventRow["status"]>;

function serializeEvent(row: EventRow) {
  return {
    ...row,
    startDatetime: row.startDatetime.toISOString(),
    endDatetime: row.endDatetime.toISOString(),
    registrationDeadline: row.registrationDeadline?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

export type CachedEvent = ReturnType<typeof serializeEvent>;

export const getCachedEventList = unstable_cache(
  async (
    filter: string,
    includeDrafts: boolean,
    page: number,
    limit: number
  ): Promise<{ events: CachedEvent[]; total: number }> => {
    const conditions = [eq(events.isDeleted, false)];
    if (filter === "upcoming") {
      const now = new Date();
      conditions.push(notInArray(events.status, ["completed", "cancelled"]));
      const upcomingCondition = or(gte(events.endDatetime, now), gte(events.startDatetime, now));
      if (upcomingCondition) {
        conditions.push(upcomingCondition);
      }
    } else if (filter === "active") {
      conditions.push(inArray(events.status, ["published", "ongoing", "draft"]));
    } else if (filter !== "all") {
      conditions.push(eq(events.status, filter as EventStatus));
    }

    if (!includeDrafts) {
      conditions.push(ne(events.status, "draft"));
    }

    const [eventsList, totalResult] = await Promise.all([
      db
        .select()
        .from(events)
        .where(and(...conditions))
        .orderBy(desc(events.startDatetime))
        .limit(limit)
        .offset(page * limit),
      db
        .select({ count: count() })
        .from(events)
        .where(and(...conditions)),
    ]);

    return { events: eventsList.map(serializeEvent), total: totalResult[0].count };
  },
  ["events-list"],
  { tags: [EVENTS_CACHE_TAG], revalidate: EVENTS_CACHE_REVALIDATE_SECONDS }
);

export const getCachedEvent = unstable_cache(
  async (id: string): Promise<CachedEvent | null> => {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event ? serializeEvent(event) : null;
  },
  ["event-by-id"],
  { tags: [EVENTS_CACHE_TAG], revalidate: EVENTS_CACHE_REVALIDATE_SECONDS }
);

export function invalidateEventsCache() {
  revalidateTag(EVENTS_CACHE_TAG, { expire: 0 });
}