import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { events, eventRegistrations, studentProfiles, users } from "@/db/schema";
import { eq, and, sql, inArray, isNull } from "drizzle-orm";
import { createEventSchema } from "@/lib/validators";
import { NextResponse } from "next/server";
import { awardPoints } from "@/lib/points";
import { canViewDraftEvents, getRoleFromSession, isAdminRole } from "@/lib/roles";
import { parsePagination } from "@/lib/request";
import { getCachedEventList, invalidateEventsCache } from "@/lib/events-cache";

async function getSession() {
  return await auth.api.getSession({ headers: await headers() });
}

export async function GET(request: Request) {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const { page, limit } = parsePagination(searchParams, 10);
  const status = searchParams.get("status") || "published";
  const upcomingParam = searchParams.get("upcoming");
  const filter = upcomingParam === "true" || status === "upcoming" ? "upcoming" : status;

  const { events: eventsList, total } = await getCachedEventList(
    filter,
    canViewDraftEvents(getRoleFromSession(session)),
    page,
    limit
  );

  let registeredEventIds = new Set<string>();
  if (session && eventsList.length > 0) {
    const regs = await db
      .select({ eventId: eventRegistrations.eventId })
      .from(eventRegistrations)
      .innerJoin(studentProfiles, eq(eventRegistrations.studentId, studentProfiles.id))
      .where(
        and(
          inArray(
            eventRegistrations.eventId,
            eventsList.map((e) => e.id)
          ),
          eq(studentProfiles.userId, session.user.id),
          isNull(eventRegistrations.cancelledAt)
        )
      );
    registeredEventIds = new Set(regs.map((r) => r.eventId));
  }

  const eventsWithRegistration = eventsList.map((e) => ({
    ...e,
    registered: registeredEventIds.has(e.id),
  }));

  return NextResponse.json({
    events: eventsWithRegistration,
    total,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const errorMessages = Object.entries(fieldErrors)
      .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
      .join(" • ");
    return NextResponse.json(
      { error: errorMessages || "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { volunteerEmails, ...eventData } = parsed.data;

  const [event] = await db
    .insert(events)
    .values({
      ...eventData,
      startDatetime: new Date(parsed.data.startDatetime),
      endDatetime: new Date(parsed.data.endDatetime),
      registrationDeadline: parsed.data.registrationDeadline
        ? new Date(parsed.data.registrationDeadline)
        : null,
      coordinatorId: session.user.id,
      status: parsed.data.status || "published",
    })
    .returning();

  invalidateEventsCache();

  if (isAdminRole(role) && volunteerEmails && volunteerEmails.length > 0) {
    const cleanedEmails = volunteerEmails.map((e) => e.trim().toLowerCase());
    const profiles = await db
      .select({ studentId: studentProfiles.id })
      .from(studentProfiles)
      .innerJoin(users, eq(studentProfiles.userId, users.id))
      .where(inArray(sql`LOWER(${users.email})`, cleanedEmails));

    if (profiles.length > 0) {
      const regValues = profiles.map((p) => ({
        eventId: event.id,
        studentId: p.studentId,
        role: "volunteer" as "volunteer" | "participant",
      }));
      await db.insert(eventRegistrations).values(regValues);

      for (const p of profiles) {
        await awardPoints({
          studentId: p.studentId,
          activityType: "event_volunteer",
          referenceId: event.id,
          referenceType: "event",
          customPoints: event.volunteerPoints ?? 20,
          note: `Volunteered for event: ${event.title}`,
          awardedBy: session.user.id,
        });
      }
    }
  }

  return NextResponse.json(event, { status: 201 });
}