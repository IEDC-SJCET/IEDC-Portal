/**
 * Shared layout spec for the IEDC attendance roster ("Attendance Template - IEDC.docx").
 */

import { isExecomPlaceholderProfile } from "@/lib/roles";

export interface AttendanceStudent {
  name: string;
  department: string;
  batch: string;
  userRole?: string | null;
  section?: string | null;
}

/** The slice of a registration record the roster actually prints. */
export interface AttendanceRegistration {
  student: AttendanceStudent;
  attended: boolean;
}

export interface AttendanceReportMeta {
  title: string;
  startDatetime?: string | null;
}

export interface AttendanceRow {
  slNo: string;
  name: string;
  department: string;
  year: string;
  batch: string;
  /** Sort key only; `attendanceRowValues` does not print it. */
  section: string;
  attended: boolean;
}

export type ColumnAlignment = "left" | "center" | "right";

/**
 * Column widths are in dxa (twentieths of a point), straight from the template grid.
 * `align` is the data cells' alignment; header cells are always centred.
 */
export const ATTENDANCE_COLUMNS: ReadonlyArray<{
  header: string;
  width: number;
  align: ColumnAlignment;
}> = [
    { header: "Sl. No.", width: 1020, align: "right" },
    { header: "Name", width: 2523, align: "left" },
    { header: "Department", width: 1200, align: "left" },
    { header: "Year", width: 960, align: "left" },
    { header: "Batch", width: 1117, align: "left" },
    { header: "Attendance", width: 2206, align: "center" },
  ];

export const PAGE = {
  width: 11906,
  height: 16838,
  margin: 1440,
  headerDistance: 720,
  footerDistance: 720,
} as const;

export const TABLE = {
  headerRowHeight: 315,
  /** Tall rows so there is room to sign. */
  dataRowHeight: 825,
  cellMargin: 40,
  /** Border width in eighths of a point. */
  borderSize: 5,
} as const;

/**
 * Centred page watermark. Word cannot set an image's opacity, so the fade is baked
 * into `public/report-watermark.png` (derived from `public/bootcamp without10.png`)
 * and both writers share that one asset, keeping the two formats identical.
 */
export const WATERMARK = {
  src: "/report-watermark.png",
  /** Printed size in points, matching the template's centred 234pt mark. */
  width: 240,
  /** Keeps the asset's 538x464 aspect ratio. */
  height: 207,
} as const;

/** Reads the watermark bytes. A failure just means the report prints without it. */
export async function loadWatermark(): Promise<ArrayBuffer | null> {
  try {
    const response = await fetch(WATERMARK.src);
    if (!response.ok) return null;
    return await response.arrayBuffer();
  } catch {
    return null;
  }
}

export const FONT = {
  family: "Arial",
  /** Half-points, as Word measures them. */
  headingSize: 26,
  tableSize: 20,
  footerSize: 20,
} as const;

const dash = "-";

/**
 * Study year at the time of the event. Batches are stored as "<start>-<graduation>"
 * (see the student onboarding route); a lone four digit value is a graduation year,
 * so back the start out of it assuming a four year programme. The academic year
 * rolls over in July.
 */
export function deriveStudyYear(batch: string, eventDate: Date): string {
  const parts = (batch || "")
    .split(dash)
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((value) => Number.isFinite(value));

  if (parts.length === 0) return dash;
  // A four year programme is the fallback when only the graduation year is on record.
  const [startYear, gradYear] = parts.length >= 2 ? parts : [parts[0] - 4, parts[0]];
  const duration = gradYear - startYear;
  if (duration < 1) return dash;

  const academicYear =
    eventDate.getMonth() >= 6 ? eventDate.getFullYear() : eventDate.getFullYear() - 1;
  const year = academicYear - startYear + 1;

  // Anything outside the programme means stale data, so leave the cell to be filled by hand.
  return year >= 1 && year <= duration ? String(year) : dash;
}

/** dd-mm-yyyy, matching the template's "(xx-xx-2026)" placeholder. */
export function formatAttendanceDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()}`;
}

export function resolveEventDate(meta: AttendanceReportMeta): Date {
  const parsed = meta.startDatetime ? new Date(meta.startDatetime) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
}

/** The running header line, e.g. "Bootcamp 2026 - ATTENDANCE (10-09-2026)". */
export function buildAttendanceHeading(meta: AttendanceReportMeta): string {
  return `${meta.title || "Event"} - ATTENDANCE (${formatAttendanceDate(resolveEventDate(meta))})`;
}

/**
 * Drops accounts that are not students: the shared Execom role mailboxes, whose
 * profiles carry placeholder department and batch values, and faculty.
 *
 * A real student who holds an Execom title still attends as a student, so they keep
 * their row — the title alone is not a reason to leave someone off the sheet.
 */
export function excludeNonStudents<T extends AttendanceRegistration>(
  registrations: T[]
): T[] {
  return registrations.filter((registration) => {
    const student = registration.student;
    return student?.userRole !== "faculty" && !isExecomPlaceholderProfile(student ?? {});
  });
}

/** Case-insensitive, and orders embedded digits by value rather than by character. */
const collator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

/** Rows with nothing recorded sort last, so the sheet opens with complete entries. */
function compareText(a: string, b: string): number {
  const aMissing = !a || a === dash;
  const bMissing = !b || b === dash;
  if (aMissing !== bMissing) return aMissing ? 1 : -1;
  if (aMissing) return 0;
  return collator.compare(a, b);
}

/** Study years run 1, 2, 3, 4 with the unknown ones after them. */
function compareYear(a: string, b: string): number {
  const aYear = Number.parseInt(a, 10);
  const bYear = Number.parseInt(b, 10);
  const aKnown = Number.isFinite(aYear);
  const bKnown = Number.isFinite(bYear);
  if (aKnown !== bKnown) return aKnown ? -1 : 1;
  return aKnown ? aYear - bYear : 0;
}

/** Roster order: department, then year, then section, then name. */
function compareRows(a: AttendanceRow, b: AttendanceRow): number {
  return (
    compareText(a.department, b.department) ||
    compareYear(a.year, b.year) ||
    compareText(a.section, b.section) ||
    compareText(a.name, b.name)
  );
}

export function buildAttendanceRows(
  registrations: AttendanceRegistration[],
  eventDate: Date
): AttendanceRow[] {
  // Filtered here as well as at the call sites, so no writer can emit a non-student.
  return excludeNonStudents(registrations)
    .map((registration) => {
      const student = registration.student;
      return {
        slNo: "",
        name: student?.name || dash,
        department: student?.department || dash,
        year: deriveStudyYear(student?.batch || "", eventDate),
        batch: student?.batch || dash,
        section: student?.section?.trim() || "",
        attended: !!registration.attended,
      };
    })
    .sort(compareRows)
    // Numbered after sorting, so Sl. No. runs straight down the printed page.
    .map((row, index) => ({ ...row, slNo: String(index + 1) }));
}

export function attendanceRowValues(row: AttendanceRow): string[] {
  return [
    row.slNo,
    row.name,
    row.department,
    row.year,
    row.batch,
    row.attended ? "Present" : "Not Marked",
  ];
}

export function buildAttendanceFileName(
  title: string,
  extension: "pdf" | "docx",
  variant?: string
): string {
  const safeTitle = (title || "Event").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const suffix = variant ? `_${variant}` : "";
  return `${safeTitle || "Event"}${suffix}_Attendance.${extension}`;
}