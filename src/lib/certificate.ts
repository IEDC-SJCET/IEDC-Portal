import { db } from "@/db";
import { certIdCounter } from "@/db/schema";
import { sql } from "drizzle-orm";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  degrees,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";

// ============================================================
// TEMPLATE CONFIGURATION
// ============================================================

export const CERTIFICATE_DEFAULTS = {
  heading: "Certificate of Participation",
  signatoryName: "Nodal Officer",
  signatoryDesignation: "IEDC, SJCET Palai",
  namePosX: 50,
  namePosY: 52,
  nameFontSize: 34,
  nameColor: "#1A0D0C",
  showDetailLine: true,
  detailPosY: 45,
  detailFontSize: 13,
} as const;

export const ORGANISATION = {
  cell: "Innovation and Entrepreneurship Development Cell",
  institute: "St. Joseph's College of Engineering and Technology, Palai",
  short: "IEDC SJCET",
} as const;

/** The subset of the template row the renderer actually reads. */
export interface CertificateTemplateConfig {
  mode: "default" | "custom";
  backgroundUrl: string | null;
  heading: string | null;
  signatoryName: string | null;
  signatoryDesignation: string | null;
  namePosX: number | null;
  namePosY: number | null;
  nameFontSize: number | null;
  nameColor: string | null;
  showDetailLine: boolean | null;
  detailPosY: number | null;
  detailFontSize: number | null;
}

export const DEFAULT_TEMPLATE: CertificateTemplateConfig = {
  mode: "default",
  backgroundUrl: null,
  heading: CERTIFICATE_DEFAULTS.heading,
  signatoryName: CERTIFICATE_DEFAULTS.signatoryName,
  signatoryDesignation: CERTIFICATE_DEFAULTS.signatoryDesignation,
  namePosX: CERTIFICATE_DEFAULTS.namePosX,
  namePosY: CERTIFICATE_DEFAULTS.namePosY,
  nameFontSize: CERTIFICATE_DEFAULTS.nameFontSize,
  nameColor: CERTIFICATE_DEFAULTS.nameColor,
  showDetailLine: CERTIFICATE_DEFAULTS.showDetailLine,
  detailPosY: CERTIFICATE_DEFAULTS.detailPosY,
  detailFontSize: CERTIFICATE_DEFAULTS.detailFontSize,
};

export interface CertificateRenderInput {
  template: CertificateTemplateConfig;
  recipientName: string;
  /** Class line, e.g. "Computer Science & Engineering — Batch 2027". */
  recipientDetail: string;
  certificateNumber: string;
  issuedAt: Date;
  event: {
    title: string;
    eventType: string;
    venue: string | null;
    startDatetime: Date;
    endDatetime: Date;
  };
}

// ============================================================
// TEXT SAFETY
// ============================================================

/**
 * pdf-lib's standard fonts are WinAnsi-encoded and THROW on any character
 * outside that range. Student names and event titles are user input, so every
 * string must pass through here before it reaches drawText — otherwise a single
 * emoji or curly quote in an event title fails the whole batch.
 */
export function sanitizeForPdf(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[–—―]/g, "-")
    .replace(/[…]/g, "...")
    .replace(/[   ]/g, " ")
    .replace(/[•]/g, "-")
    // Drop anything WinAnsi cannot represent (emoji, CJK, control chars).
    .replace(/[^\x20-\x7E\xA1-\xFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Builds the "class" line shown under the recipient's name. */
export function formatRecipientDetail(
  department: string | null | undefined,
  batch: string | null | undefined
): string {
  const parts: string[] = [];
  if (department) parts.push(department.trim());
  if (batch) parts.push(`Batch ${batch.trim()}`);
  return sanitizeForPdf(parts.join(" - "));
}

function hexToRgb(hex: string | null | undefined): RGB {
  const fallback = rgb(0.102, 0.051, 0.047); // #1A0D0C
  if (!hex) return fallback;
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(clean)) return fallback;
  return rgb(
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255
  );
}

function formatEventDate(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const startStr = fmt(start);
  const endStr = fmt(end);
  return startStr === endStr ? startStr : `${startStr} to ${endStr}`;
}

function titleCaseType(eventType: string): string {
  return eventType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Draws text horizontally centred on `centerX`. */
function drawCentered(
  page: PDFPage,
  text: string,
  opts: { centerX: number; y: number; size: number; font: PDFFont; color: RGB }
) {
  const safe = sanitizeForPdf(text);
  if (!safe) return;
  const width = opts.font.widthOfTextAtSize(safe, opts.size);
  page.drawText(safe, {
    x: opts.centerX - width / 2,
    y: opts.y,
    size: opts.size,
    font: opts.font,
    color: opts.color,
  });
}

/**
 * Shrinks `size` until `text` fits inside `maxWidth`, so a very long name never
 * bleeds off the edge of the certificate.
 */
function fitFontSize(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  minSize = 8
): number {
  let current = size;
  while (current > minSize && font.widthOfTextAtSize(text, current) > maxWidth) {
    current -= 1;
  }
  return current;
}

/** Greedy word wrap into lines that fit `maxWidth`. */
function wrapLines(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = sanitizeForPdf(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ============================================================
// CERTIFICATE NUMBERS
// ============================================================

/**
 * Reserves `count` sequential certificate numbers for `year` in a single atomic
 * statement, so a whole batch costs one round trip and concurrent issuers can
 * never collide on a number.
 */
export async function reserveCertificateNumbers(
  year: number,
  count: number
): Promise<string[]> {
  if (count <= 0) return [];

  const [row] = await db
    .insert(certIdCounter)
    .values({ year, count })
    .onConflictDoUpdate({
      target: certIdCounter.year,
      set: { count: sql`${certIdCounter.count} + ${count}` },
    })
    .returning({ count: certIdCounter.count });

  // `count` is the new high-water mark; this batch owns the preceding `count` slots.
  const high = row?.count ?? count;
  const start = high - count + 1;

  return Array.from(
    { length: count },
    (_, i) => `IEDC/${year}/${String(start + i).padStart(5, "0")}`
  );
}

// ============================================================
// RENDERING
// ============================================================

function decodeDataUrl(dataUrl: string): { bytes: Uint8Array; mime: string } | null {
  const match = /^data:(image\/(png|jpeg|jpg));base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) return null;
  try {
    return {
      bytes: Uint8Array.from(Buffer.from(match[3], "base64")),
      mime: match[1].toLowerCase(),
    };
  } catch {
    return null;
  }
}

/**
 * Renders one certificate to PDF bytes.
 *
 * Pure and deterministic: the same row always produces the same document, which
 * is what lets us skip storing generated files entirely.
 */
export async function renderCertificatePdf(
  input: CertificateRenderInput
): Promise<Uint8Array> {
  const { template } = input;

  if (template.mode === "custom" && template.backgroundUrl) {
    const rendered = await renderCustomCertificate(input);
    if (rendered) return rendered;
    // Unreadable artwork falls back to the built-in layout rather than erroring,
    // so a bad upload can never leave a student without a certificate.
  }

  return renderDefaultCertificate(input);
}

async function renderCustomCertificate(
  input: CertificateRenderInput
): Promise<Uint8Array | null> {
  const decoded = decodeDataUrl(input.template.backgroundUrl || "");
  if (!decoded) return null;

  try {
    const pdfDoc = await PDFDocument.create();
    const image =
      decoded.mime === "image/png"
        ? await pdfDoc.embedPng(decoded.bytes)
        : await pdfDoc.embedJpg(decoded.bytes);

    // Page matches the artwork so nothing is letterboxed or cropped.
    const page = pdfDoc.addPage([image.width, image.height]);
    page.drawImage(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
    });

    const tpl = input.template;
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const color = hexToRgb(tpl.nameColor);

    const centerX = (pct(tpl.namePosX, CERTIFICATE_DEFAULTS.namePosX) / 100) * image.width;
    const nameY = (1 - pct(tpl.namePosY, CERTIFICATE_DEFAULTS.namePosY) / 100) * image.height;

    // Scale the configured size with the artwork; the editor previews against a
    // nominal 842pt-wide page, so keep the ratio consistent at any resolution.
    const scale = image.width / 842;
    const name = sanitizeForPdf(input.recipientName) || "Participant";
    const baseSize = pct(tpl.nameFontSize, CERTIFICATE_DEFAULTS.nameFontSize) * scale;
    const nameSize = fitFontSize(name, fontBold, baseSize, image.width * 0.86);

    drawCentered(page, name, {
      centerX,
      y: nameY,
      size: nameSize,
      font: fontBold,
      color,
    });

    if (tpl.showDetailLine !== false && input.recipientDetail) {
      const detailY =
        (1 - pct(tpl.detailPosY, CERTIFICATE_DEFAULTS.detailPosY) / 100) * image.height;
      const detailSize =
        pct(tpl.detailFontSize, CERTIFICATE_DEFAULTS.detailFontSize) * scale;
      drawCentered(page, input.recipientDetail, {
        centerX,
        y: detailY,
        size: fitFontSize(
          sanitizeForPdf(input.recipientDetail),
          fontRegular,
          detailSize,
          image.width * 0.8
        ),
        font: fontRegular,
        color,
      });
    }

    // Verification footer, kept small and neutral so it sits on any artwork.
    const footer = sanitizeForPdf(`Certificate No: ${input.certificateNumber}`);
    page.drawText(footer, {
      x: image.width * 0.04,
      y: image.height * 0.03,
      size: Math.max(6, 8 * scale),
      font: fontRegular,
      color: rgb(0.45, 0.45, 0.45),
    });

    return await pdfDoc.save();
  } catch (error) {
    console.error("Custom certificate render failed, using default layout:", error);
    return null;
  }
}

function pct(value: number | null | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

async function renderDefaultCertificate(
  input: CertificateRenderInput
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  // A4 landscape.
  const PAGE_W = 842;
  const PAGE_H = 595;
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  const centerX = PAGE_W / 2;

  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.102, 0.051, 0.047); // #1A0D0C
  const crimson = rgb(0.6, 0.0, 0.0); // #990000
  const muted = rgb(0.45, 0.45, 0.45);
  const cream = rgb(0.996, 0.973, 0.933); // #FEF8EE

  // Background + double border frame.
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: cream });
  page.drawRectangle({
    x: 18,
    y: 18,
    width: PAGE_W - 36,
    height: PAGE_H - 36,
    borderColor: crimson,
    borderWidth: 3,
  });
  page.drawRectangle({
    x: 28,
    y: 28,
    width: PAGE_W - 56,
    height: PAGE_H - 56,
    borderColor: rgb(0.83, 0.78, 0.68),
    borderWidth: 1,
  });

  // Corner accents.
  for (const [cx, cy] of [
    [28, 28],
    [PAGE_W - 28, 28],
    [28, PAGE_H - 28],
    [PAGE_W - 28, PAGE_H - 28],
  ]) {
    page.drawRectangle({
      x: cx - 5,
      y: cy - 5,
      width: 10,
      height: 10,
      color: crimson,
      rotate: degrees(45),
    });
  }

  let y = PAGE_H - 92;

  drawCentered(page, ORGANISATION.short, {
    centerX,
    y,
    size: 13,
    font: sansBold,
    color: crimson,
  });
  y -= 20;

  drawCentered(page, ORGANISATION.cell, {
    centerX,
    y,
    size: 10.5,
    font: sans,
    color: muted,
  });
  y -= 15;

  drawCentered(page, ORGANISATION.institute, {
    centerX,
    y,
    size: 10.5,
    font: sans,
    color: muted,
  });
  y -= 62;

  const heading = input.template.heading || CERTIFICATE_DEFAULTS.heading;
  const headingSize = fitFontSize(
    sanitizeForPdf(heading).toUpperCase(),
    serifBold,
    34,
    PAGE_W - 140
  );
  drawCentered(page, heading.toUpperCase(), {
    centerX,
    y,
    size: headingSize,
    font: serifBold,
    color: ink,
  });
  y -= 18;

  page.drawLine({
    start: { x: centerX - 90, y },
    end: { x: centerX + 90, y },
    thickness: 1.5,
    color: crimson,
  });
  y -= 50;

  drawCentered(page, "This is to certify that", {
    centerX,
    y,
    size: 12.5,
    font: serifItalic,
    color: muted,
  });
  y -= 50;

  // Recipient name — the focal point of the document.
  const name = sanitizeForPdf(input.recipientName) || "Participant";
  const nameSize = fitFontSize(name, serifBold, 32, PAGE_W - 160);
  drawCentered(page, name, {
    centerX,
    y,
    size: nameSize,
    font: serifBold,
    color: crimson,
  });
  y -= 12;

  const nameWidth = serifBold.widthOfTextAtSize(name, nameSize);
  const underlineHalf = Math.min(PAGE_W / 2 - 70, nameWidth / 2 + 30);
  page.drawLine({
    start: { x: centerX - underlineHalf, y },
    end: { x: centerX + underlineHalf, y },
    thickness: 0.75,
    color: rgb(0.78, 0.72, 0.62),
  });
  y -= 26;

  if (input.recipientDetail) {
    drawCentered(page, input.recipientDetail, {
      centerX,
      y,
      size: fitFontSize(input.recipientDetail, sans, 11.5, PAGE_W - 180),
      font: sans,
      color: muted,
    });
    y -= 36;
  } else {
    y -= 14;
  }

  // Citation body.
  const venuePart = input.event.venue ? ` at ${input.event.venue}` : "";
  const body =
    `has actively participated in "${input.event.title}", a ${titleCaseType(input.event.eventType)} ` +
    `organised by the ${ORGANISATION.cell}, ${ORGANISATION.institute}, held on ` +
    `${formatEventDate(input.event.startDatetime, input.event.endDatetime)}${venuePart}.`;

  const bodyLines = wrapLines(body, serif, 12, PAGE_W - 200);
  for (const line of bodyLines) {
    drawCentered(page, line, {
      centerX,
      y,
      size: 12,
      font: serif,
      color: ink,
    });
    y -= 20;
  }

  // Footer: verification data left, signatory right.
  const footerY = 74;

  page.drawText(sanitizeForPdf(`Certificate No: ${input.certificateNumber}`), {
    x: 60,
    y: footerY + 14,
    size: 9,
    font: sansBold,
    color: ink,
  });
  page.drawText(
    sanitizeForPdf(
      `Issued on ${input.issuedAt.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`
    ),
    { x: 60, y: footerY, size: 9, font: sans, color: muted }
  );
  page.drawText("Verify at the IEDC Portal", {
    x: 60,
    y: footerY - 13,
    size: 8,
    font: sans,
    color: muted,
  });

  const signatory = sanitizeForPdf(
    input.template.signatoryName || CERTIFICATE_DEFAULTS.signatoryName
  );
  const designation = sanitizeForPdf(
    input.template.signatoryDesignation || CERTIFICATE_DEFAULTS.signatoryDesignation
  );
  const signRight = PAGE_W - 60;

  page.drawLine({
    start: { x: signRight - 170, y: footerY + 26 },
    end: { x: signRight, y: footerY + 26 },
    thickness: 0.75,
    color: rgb(0.55, 0.55, 0.55),
  });

  const signCenter = signRight - 85;
  drawCentered(page, signatory, {
    centerX: signCenter,
    y: footerY + 12,
    size: 10,
    font: sansBold,
    color: ink,
  });
  drawCentered(page, designation, {
    centerX: signCenter,
    y: footerY,
    size: 8.5,
    font: sans,
    color: muted,
  });

  return await pdfDoc.save();
}

/** Filename used for downloads. */
export function certificateFileName(
  eventTitle: string,
  recipientName: string
): string {
  const slug = (value: string) =>
    sanitizeForPdf(value).replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "") ||
    "Certificate";
  return `${slug(eventTitle)}_${slug(recipientName)}.pdf`;
}
