import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { certificates, events, studentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminRole } from "@/lib/roles";
import {
  certificateFileName,
  formatRecipientDetail,
  renderCertificatePdf,
} from "@/lib/certificate";
import { loadTemplateConfig } from "@/lib/certificate-service";

/**
 * Streams one certificate as a PDF, rendered on the fly from its database row.
 *
 * Nothing is stored: issuing a certificate writes a row, and the document is
 * rebuilt deterministically here whenever the student views or downloads it.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [record] = await db
      .select({
        certificate: {
          id: certificates.id,
          certificateNumber: certificates.certificateNumber,
          recipientName: certificates.recipientName,
          recipientDetail: certificates.recipientDetail,
          issuedAt: certificates.issuedAt,
          eventId: certificates.eventId,
        },
        student: {
          id: studentProfiles.id,
          userId: studentProfiles.userId,
          name: studentProfiles.name,
          department: studentProfiles.department,
          batch: studentProfiles.batch,
        },
        event: {
          title: events.title,
          eventType: events.eventType,
          venue: events.venue,
          startDatetime: events.startDatetime,
          endDatetime: events.endDatetime,
        },
      })
      .from(certificates)
      .leftJoin(studentProfiles, eq(certificates.studentId, studentProfiles.id))
      .leftJoin(events, eq(certificates.eventId, events.id))
      .where(eq(certificates.id, id));

    if (!record || !record.event) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    // Only the owner may read their certificate; staff may read any of them.
    const role = (session.user as Record<string, unknown>).role as string;
    const isStaff = isAdminRole(role) || role === "faculty";
    const isOwner = record.student?.userId === session.user.id;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const template = await loadTemplateConfig(record.certificate.eventId!);

    // Snapshot columns win; the live profile is only a fallback for rows issued
    // before snapshots existed.
    const recipientName =
      record.certificate.recipientName || record.student?.name || "Participant";
    const recipientDetail =
      record.certificate.recipientDetail ||
      formatRecipientDetail(
        record.student?.department,
        record.student?.batch
      );

    const pdfBytes = await renderCertificatePdf({
      template,
      recipientName,
      recipientDetail,
      certificateNumber: record.certificate.certificateNumber,
      issuedAt: record.certificate.issuedAt ?? new Date(),
      event: {
        title: record.event.title,
        eventType: record.event.eventType,
        venue: record.event.venue,
        startDatetime: record.event.startDatetime,
        endDatetime: record.event.endDatetime,
      },
    });

    const wantsDownload =
      new URL(request.url).searchParams.get("download") === "1";
    const fileName = certificateFileName(record.event.title, recipientName);

    return new NextResponse(
      new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${
            wantsDownload ? "attachment" : "inline"
          }; filename="${fileName}"`,
          // Issued certificates are immutable, but keep it private to the viewer.
          "Cache-Control": "private, max-age=3600",
        },
      }
    );
  } catch (err) {
    console.error("Failed to render certificate:", err);
    return NextResponse.json(
      { error: "Failed to render certificate" },
      { status: 500 }
    );
  }
}
