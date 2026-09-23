import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeightRule,
  HorizontalPositionAlign,
  HorizontalPositionRelativeFrom,
  ImageRun,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalPositionAlign,
  VerticalPositionRelativeFrom,
  WidthType,
} from "docx";
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

export type {
  AttendanceRegistration,
  AttendanceReportMeta,
  AttendanceRow,
} from "@/lib/attendance-report";

const alignmentFor = (align: ColumnAlignment) =>
  align === "center"
    ? AlignmentType.CENTER
    : align === "right"
      ? AlignmentType.RIGHT
      : AlignmentType.LEFT;

/** Every cell in the template carries the same hairline box. */
const cellBorders = {
  top: { style: BorderStyle.SINGLE, size: TABLE.borderSize, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: TABLE.borderSize, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: TABLE.borderSize, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: TABLE.borderSize, color: "000000" },
};

function buildCell(text: string, width: number, align: ColumnAlignment, bold: boolean): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: cellBorders,
    margins: {
      top: TABLE.cellMargin,
      bottom: TABLE.cellMargin,
      left: TABLE.cellMargin,
      right: TABLE.cellMargin,
    },
    verticalAlign: VerticalAlign.BOTTOM,
    children: [
      new Paragraph({
        alignment: alignmentFor(align),
        children: [new TextRun({ text, bold, size: FONT.tableSize })],
      }),
    ],
  });
}

export async function generateAttendanceDocx(
  meta: AttendanceReportMeta,
  registrations: AttendanceRegistration[]
): Promise<Blob> {
  const rows = buildAttendanceRows(registrations, resolveEventDate(meta));
  const watermark = await loadWatermark();

  // docx measures images in pixels at 96 DPI, so convert from the spec's points.
  const toPx = (points: number) => Math.round((points * 96) / 72);
  const watermarkRun = watermark
    ? new ImageRun({
      type: "png",
      data: watermark,
      transformation: {
        width: toPx(WATERMARK.width),
        height: toPx(WATERMARK.height),
      },
      floating: {
        horizontalPosition: {
          relative: HorizontalPositionRelativeFrom.MARGIN,
          align: HorizontalPositionAlign.CENTER,
        },
        verticalPosition: {
          relative: VerticalPositionRelativeFrom.MARGIN,
          align: VerticalPositionAlign.CENTER,
        },
        behindDocument: true,
        allowOverlap: true,
      },
      altText: {
        name: "Watermark",
        description: "SJCET Boot Camp",
        title: "SJCET Boot Camp",
      },
    })
    : null;

  const headerRow = new TableRow({
    tableHeader: true,
    height: { value: TABLE.headerRowHeight, rule: HeightRule.ATLEAST },
    children: ATTENDANCE_COLUMNS.map((column) =>
      buildCell(column.header, column.width, "center", true)
    ),
  });

  const dataRows = rows.map(
    (row) =>
      new TableRow({
        height: { value: TABLE.dataRowHeight, rule: HeightRule.ATLEAST },
        children: attendanceRowValues(row).map((value, index) =>
          buildCell(
            value,
            ATTENDANCE_COLUMNS[index].width,
            ATTENDANCE_COLUMNS[index].align,
            false
          )
        ),
      })
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT.family, size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE.width,
              height: PAGE.height,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: PAGE.margin,
              right: PAGE.margin,
              bottom: PAGE.margin,
              left: PAGE.margin,
              header: PAGE.headerDistance,
              footer: PAGE.footerDistance,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: buildAttendanceHeading(meta),
                    bold: true,
                    size: FONT.headingSize,
                  }),
                  ...(watermarkRun ? [watermarkRun] : []),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: " Page ", size: FONT.footerSize }),
                  new TextRun({ children: [PageNumber.CURRENT], size: FONT.footerSize }),
                ],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({}),
          new Table({
            width: {
              size: ATTENDANCE_COLUMNS.reduce((total, column) => total + column.width, 0),
              type: WidthType.DXA,
            },
            layout: TableLayoutType.FIXED,
            columnWidths: ATTENDANCE_COLUMNS.map((column) => column.width),
            rows: [headerRow, ...dataRows],
          }),
        ],
      },
    ],
  });

  return await Packer.toBlob(doc);
}