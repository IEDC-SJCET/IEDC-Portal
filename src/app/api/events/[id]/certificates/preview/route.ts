import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/roles";
import { certificateTemplateSchema } from "@/lib/validators";
import {
  DEFAULT_TEMPLATE,
  formatRecipientDetail,
  renderCertificatePdf,
  type CertificateTemplateConfig,
} from "@/lib/certificate";
import {
  getEligibleAttendees,
  loadEventForCertificate,
  loadTemplateConfig,
} from "@/lib/certificate-service";

/**
 * Renders a throwaway sample certificate so the Execom can see exactly what
 * recipients will get before anything is sent.
 *
 * POST (not GET) because the preview reflects the *unsaved* design currently in
 * the editor, artwork included — far too large for a query string.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  if (!isAdminRole(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const event = await loadEventForCertificate(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    let template: CertificateTemplateConfig;
    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const draft = (body as { template?: unknown } | null)?.template;
    if (draft) {
      const parsed = certificateTemplateSchema.safeParse(draft);
      if (!parsed.success) {
        const fieldErrors = parsed.error.flatten().fieldErrors;
        const message = Object.entries(fieldErrors)
          .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
          .join(" • ");
        return NextResponse.json(
          { error: message || "Invalid template" },
          { status: 400 }
        );
      }
      template = { ...DEFAULT_TEMPLATE, ...parsed.data };
    } else {
      template = await loadTemplateConfig(id);
    }

    // Prefer a real attendee so the preview shows a realistic name length.
    const attendees = await getEligibleAttendees(id);
    const sample = attendees[0];

    const pdfBytes = await renderCertificatePdf({
      template,
      recipientName: sample?.name || "Participant Name",
      recipientDetail: sample
        ? formatRecipientDetail(sample.department, sample.batch)
        : formatRecipientDetail("Computer Science & Engineering", "2027"),
      certificateNumber: `IEDC/${new Date().getFullYear()}/PREVIEW`,
      issuedAt: new Date(),
      event: {
        title: event.title,
        eventType: event.eventType,
        venue: event.venue,
        startDatetime: event.startDatetime,
        endDatetime: event.endDatetime,
      },
    });

    return new NextResponse(
      new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }),
      {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'inline; filename="certificate-preview.pdf"',
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("Certificate preview failed:", err);
    return NextResponse.json(
      { error: "Failed to render preview" },
      { status: 500 }
    );
  }
}
