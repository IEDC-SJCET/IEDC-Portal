import { db } from "@/db";
import {
  certificates,
  eventAttendance,
  eventRegistrations,
  eventCertificateTemplates,
  events,
  studentProfiles,
} from "@/db/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import {
  DEFAULT_TEMPLATE,
  formatRecipientDetail,
  reserveCertificateNumbers,
  type CertificateTemplateConfig,
} from "@/lib/certificate";

/** Canonical download path for an issued certificate. */
export function certificateUrlFor(certificateId: string): string {
  return `/api/certificates/${certificateId}/file`;
}

/**
 * Reads the event's saved template, falling back to the built-in design when the
 * event has never been configured.
 */
export async function loadTemplateConfig(
  eventId: string
): Promise<CertificateTemplateConfig> {
  const [row] = await db
    .select()
    .from(eventCertificateTemplates)
    .where(eq(eventCertificateTemplates.eventId, eventId));

  if (!row) return { ...DEFAULT_TEMPLATE };

  return {
    mode: row.mode,
    backgroundUrl: row.backgroundUrl,
    heading: row.heading,
    signatoryName: row.signatoryName,
    signatoryDesignation: row.signatoryDesignation,
    namePosX: row.namePosX,
    namePosY: row.namePosY,
    nameFontSize: row.nameFontSize,
    nameColor: row.nameColor,
    showDetailLine: row.showDetailLine,
    detailPosY: row.detailPosY,
    detailFontSize: row.detailFontSize,
  };
}

export interface EligibleAttendee {
  studentId: string;
  name: string;
  department: string;
  batch: string;
  iecdId: string;
  registrationRole: string | null;
  certificateId: string | null;
  certificateNumber: string | null;
  issuedAt: Date | null;
}

/**
 * The single definition of "who earns a certificate": a student holding an
 * active (non-cancelled) registration for the event who was also marked present
 * through QR attendance. Registered-but-absent and absent-but-scanned-elsewhere
 * students are both excluded by construction.
 *
 * Returns everyone eligible, annotated with the certificate they already hold,
 * so the caller can render a roster and issue only what is missing.
 */
export async function getEligibleAttendees(
  eventId: string
): Promise<EligibleAttendee[]> {
  return db
    .select({
      studentId: studentProfiles.id,
      name: studentProfiles.name,
      department: studentProfiles.department,
      batch: studentProfiles.batch,
      iecdId: studentProfiles.iecdId,
      registrationRole: eventRegistrations.role,
      certificateId: certificates.id,
      certificateNumber: certificates.certificateNumber,
      issuedAt: certificates.issuedAt,
    })
    .from(eventRegistrations)
    .innerJoin(
      studentProfiles,
      eq(eventRegistrations.studentId, studentProfiles.id)
    )
    // INNER JOIN on attendance is what restricts issuance to students who
    // actually turned up and were scanned in.
    .innerJoin(
      eventAttendance,
      and(
        eq(eventAttendance.eventId, eventRegistrations.eventId),
        eq(eventAttendance.studentId, eventRegistrations.studentId)
      )
    )
    .leftJoin(
      certificates,
      and(
        eq(certificates.eventId, eventRegistrations.eventId),
        eq(certificates.studentId, eventRegistrations.studentId)
      )
    )
    .where(
      and(
        eq(eventRegistrations.eventId, eventId),
        isNull(eventRegistrations.cancelledAt)
      )
    )
    .orderBy(asc(studentProfiles.name));
}

export interface IssueResult {
  issued: number;
  alreadyIssued: number;
  eligible: number;
}

/**
 * Issues certificates to every eligible attendee who does not already hold one.
 *
 * Cost is independent of headcount: one number reservation plus batched inserts.
 * No PDF is produced here — documents are rendered on demand from these rows.
 */
export async function issueCertificatesForEvent(params: {
  eventId: string;
  issuedBy: string;
}): Promise<IssueResult> {
  const { eventId, issuedBy } = params;

  const eligible = await getEligibleAttendees(eventId);
  const pending = eligible.filter((row) => !row.certificateId);
  const alreadyIssued = eligible.length - pending.length;

  if (pending.length === 0) {
    return { issued: 0, alreadyIssued, eligible: eligible.length };
  }

  const year = new Date().getFullYear();
  const numbers = await reserveCertificateNumbers(year, pending.length);

  const rows = pending.map((attendee, index) => {
    // Pre-generating the id lets the row carry its own download URL in a single
    // INSERT, with no follow-up UPDATE pass.
    const id = crypto.randomUUID();
    return {
      id,
      certificateNumber: numbers[index],
      studentId: attendee.studentId,
      eventId,
      certificateUrl: certificateUrlFor(id),
      recipientName: attendee.name,
      recipientDetail: formatRecipientDetail(
        attendee.department,
        attendee.batch
      ),
      issuedBy,
    };
  });

  // Chunked so a very large event stays well inside parameter limits.
  const CHUNK = 500;
  let issued = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const inserted = await db
      .insert(certificates)
      .values(rows.slice(i, i + CHUNK))
      // The unique (event_id, student_id) index makes a concurrent double-click
      // a no-op instead of a duplicate certificate.
      .onConflictDoNothing({
        target: [certificates.eventId, certificates.studentId],
      })
      .returning({ id: certificates.id });
    issued += inserted.length;
  }

  return { issued, alreadyIssued, eligible: eligible.length };
}

/** Summary counters for the Execom certificate panel. */
export async function getCertificateStats(eventId: string) {
  const [row] = await db
    .select({
      issued: sql<number>`count(*)::int`,
      lastIssuedAt: sql<Date | null>`max(${certificates.issuedAt})`,
    })
    .from(certificates)
    .where(eq(certificates.eventId, eventId));

  return {
    issued: row?.issued ?? 0,
    lastIssuedAt: row?.lastIssuedAt ?? null,
  };
}

/** Loads the event fields the renderer needs. */
export async function loadEventForCertificate(eventId: string) {
  const [event] = await db
    .select({
      id: events.id,
      title: events.title,
      eventType: events.eventType,
      venue: events.venue,
      startDatetime: events.startDatetime,
      endDatetime: events.endDatetime,
      status: events.status,
    })
    .from(events)
    .where(eq(events.id, eventId));

  return event ?? null;
}
