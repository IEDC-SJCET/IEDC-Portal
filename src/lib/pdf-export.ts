import type { PDFFont, PDFPage } from "pdf-lib";
import {
  ATTENDANCE_COLUMNS,
  AttendanceRegistration,
  AttendanceReportMeta,
  ColumnAlignment,
  FONT,
  PAGE,
  TABLE,
  WATERMARK,
  attendanceRowValues,
  buildAttendanceHeading,
  buildAttendanceRows,
  loadWatermark,
  resolveEventDate,
} from "@/lib/attendance-report";

/** The spec measures everything in dxa; PDF points are twenty times coarser. */
const pt = (dxa: number) => dxa / 20;

const PAGE_WIDTH = pt(PAGE.width);
const PAGE_HEIGHT = pt(PAGE.height);
const MARGIN = pt(PAGE.margin);
const CELL_MARGIN = pt(TABLE.cellMargin);
const HEADER_ROW_HEIGHT = pt(TABLE.headerRowHeight);
const DATA_ROW_HEIGHT = pt(TABLE.dataRowHeight);
/** Word sizes borders in eighths of a point, text in half-points. */
const BORDER_WIDTH = TABLE.borderSize / 8;
const HEADING_SIZE = FONT.headingSize / 2;
const TABLE_SIZE = FONT.tableSize / 2;
const FOOTER_SIZE = FONT.footerSize / 2;

const COLUMN_WIDTHS = ATTENDANCE_COLUMNS.map((column) => pt(column.width));
const TABLE_WIDTH = COLUMN_WIDTHS.reduce((total, width) => total + width, 0);
/** Left edge of each column, plus the table's right edge as the final entry. */
const COLUMN_EDGES = COLUMN_WIDTHS.reduce<number[]>(
  (edges, width) => [...edges, edges[edges.length - 1] + width],
  [MARGIN]
);

const TABLE_TOP = PAGE_HEIGHT - MARGIN;
const TABLE_BOTTOM_LIMIT = MARGIN;
const ROWS_PER_PAGE = Math.max(
  1,
  Math.floor((TABLE_TOP - TABLE_BOTTOM_LIMIT - HEADER_ROW_HEIGHT) / DATA_ROW_HEIGHT)
);

/** Line spacing Word applies to the template's 10pt table text. */
const LINE_HEIGHT = TABLE_SIZE * 1.15;
/** A tall data row holds two lines of text; anything longer is ellipsised. */
const MAX_LINES = Math.max(1, Math.floor((DATA_ROW_HEIGHT - CELL_MARGIN * 2) / LINE_HEIGHT));

/** Trims to the available width, ellipsising rather than spilling into the next column. */
function fitText(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;

  let trimmed = text;
  while (trimmed.length > 1 && font.widthOfTextAtSize(`${trimmed}...`, size) > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
}

/** Wraps on words the way Word does, capped at the number of lines the row can show. */
function wrapText(text: string, font: PDFFont, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = [];
  let current = "";

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    // A single over-wide word still starts its own line; fitText trims it below.
    if (!current || font.widthOfTextAtSize(candidate, TABLE_SIZE) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  const kept =
    lines.length <= maxLines
      ? lines
      : [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(" ")];

  return kept.map((line) => fitText(line, font, TABLE_SIZE, maxWidth));
}

function drawCellText(
  page: PDFPage,
  text: string,
  columnIndex: number,
  align: ColumnAlignment,
  cellBottom: number,
  font: PDFFont,
  maxLines: number
) {
  if (!text) return;

  const available = COLUMN_WIDTHS[columnIndex] - CELL_MARGIN * 2;
  const left = COLUMN_EDGES[columnIndex] + CELL_MARGIN;
  const lines = wrapText(text, font, available, maxLines);

  // Word bottom-aligns cells, so the last line sits just above the row's lower border.
  lines.forEach((line, lineIndex) => {
    const width = font.widthOfTextAtSize(line, TABLE_SIZE);
    const x =
      align === "center"
        ? left + (available - width) / 2
        : align === "right"
        ? left + available - width
        : left;

    page.drawText(line, {
      x,
      y: cellBottom + CELL_MARGIN + (lines.length - 1 - lineIndex) * LINE_HEIGHT,
      size: TABLE_SIZE,
      font,
    });
  });
}

/**
 * Renders the attendance roster in the IEDC template layout: landscape sheet,
 * running event header, six column signing table, "Page N" footer. Mirrors
 * `generateAttendanceDocx` so both downloads print identically.
 */
export async function generateAttendancePdf(
  meta: AttendanceReportMeta,
  registrations: AttendanceRegistration[]
): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0, 0, 0);

  // The asset is already faded, so it needs no extra opacity here — same bytes as the DOCX.
  const watermarkBytes = await loadWatermark();
  let watermark = null;
  if (watermarkBytes) {
    try {
      watermark = await pdfDoc.embedPng(watermarkBytes);
    } catch (e) {
      console.error("Watermark could not be embedded, printing without it:", e);
    }
  }

  const heading = buildAttendanceHeading(meta);
  const rows = buildAttendanceRows(registrations, resolveEventDate(meta));
  const pageCount = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));

  for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const pageRows = rows.slice(pageIndex * ROWS_PER_PAGE, (pageIndex + 1) * ROWS_PER_PAGE);

    // Drawn first so the table and text sit on top of it.
    if (watermark) {
      page.drawImage(watermark, {
        x: (PAGE_WIDTH - WATERMARK.width) / 2,
        y: (PAGE_HEIGHT - WATERMARK.height) / 2,
        width: WATERMARK.width,
        height: WATERMARK.height,
      });
    }

    // Running header, centred in the top margin.
    const headingText = fitText(heading, fontBold, HEADING_SIZE, PAGE_WIDTH - MARGIN * 2);
    page.drawText(headingText, {
      x: (PAGE_WIDTH - fontBold.widthOfTextAtSize(headingText, HEADING_SIZE)) / 2,
      y: PAGE_HEIGHT - pt(PAGE.headerDistance) - HEADING_SIZE,
      size: HEADING_SIZE,
      font: fontBold,
      color: ink,
    });

    // Column headers sit on the first row, data rows follow beneath.
    const rowTops = [TABLE_TOP];
    const rowHeights = [HEADER_ROW_HEIGHT, ...pageRows.map(() => DATA_ROW_HEIGHT)];
    for (const height of rowHeights) {
      rowTops.push(rowTops[rowTops.length - 1] - height);
    }
    const tableBottom = rowTops[rowTops.length - 1];

    for (const y of rowTops) {
      page.drawLine({
        start: { x: MARGIN, y },
        end: { x: MARGIN + TABLE_WIDTH, y },
        thickness: BORDER_WIDTH,
        color: ink,
      });
    }

    for (const x of COLUMN_EDGES) {
      page.drawLine({
        start: { x, y: TABLE_TOP },
        end: { x, y: tableBottom },
        thickness: BORDER_WIDTH,
        color: ink,
      });
    }

    ATTENDANCE_COLUMNS.forEach((column, columnIndex) => {
      drawCellText(page, column.header, columnIndex, "center", rowTops[1], fontBold, 1);
    });

    pageRows.forEach((row, rowIndex) => {
      const cellBottom = rowTops[rowIndex + 2];
      attendanceRowValues(row).forEach((value, columnIndex) => {
        drawCellText(
          page,
          value,
          columnIndex,
          ATTENDANCE_COLUMNS[columnIndex].align,
          cellBottom,
          fontRegular,
          MAX_LINES
        );
      });
    });

    // Right aligned "Page N" in the bottom margin.
    const footerText = ` Page ${pageIndex + 1}`;
    page.drawText(footerText, {
      x: PAGE_WIDTH - MARGIN - fontRegular.widthOfTextAtSize(footerText, FOOTER_SIZE),
      y: pt(PAGE.footerDistance),
      size: FOOTER_SIZE,
      font: fontRegular,
      color: ink,
    });
  }

  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
}

export type { AttendanceRegistration, AttendanceReportMeta } from "@/lib/attendance-report";
