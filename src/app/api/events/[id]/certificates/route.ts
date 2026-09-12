import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/roles";
import {
  getCertificateStats,
  getEligibleAttendees,
  issueCertificatesForEvent,
  loadEventForCertificate,
  loadTemplateConfig,
} from "@/lib/certificate-service";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }
  const role = (session.user as Record<string, unknown>).role as string;
  if (!isAdminRole(role)) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      session: null,
    };
  }
  return { error: null, session };
}

/** Certificate panel state for one event: template, roster and counters. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  try {
    const event = await loadEventForCertificate(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const [template, attendees, stats] = await Promise.all([
      loadTemplateConfig(id),
      getEligibleAttendees(id),
      getCertificateStats(id),
    ]);

    const pending = attendees.filter((a) => !a.certificateId).length;

    return NextResponse.json({
      event: {
        id: event.id,
        title: event.title,
        status: event.status,
      },
      template,
      canIssue: event.status === "completed",
      stats: {
        eligible: attendees.length,
        issued: stats.issued,
        pending,
        lastIssuedAt: stats.lastIssuedAt,
      },
      attendees: attendees.map((a) => ({
        studentId: a.studentId,
        name: a.name,
        department: a.department,
        batch: a.batch,
        iecdId: a.iecdId,
        registrationRole: a.registrationRole,
        certificateId: a.certificateId,
        certificateNumber: a.certificateNumber,
        issuedAt: a.issuedAt,
      })),
    });
  } catch (err) {
    console.error("Failed to load event certificates:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** Issues certificates to every registered attendee who does not hold one yet. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  try {
    const event = await loadEventForCertificate(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    // Certificates attest to a finished event — refuse anything else.
    if (event.status !== "completed") {
      return NextResponse.json(
        {
          error:
            "Certificates can only be sent once the event is marked as completed.",
        },
        { status: 400 }
      );
    }

    const result = await issueCertificatesForEvent({
      eventId: id,
      issuedBy: session!.user.id,
    });

    if (result.eligible === 0) {
      return NextResponse.json(
        {
          error:
            "No eligible recipients. Certificates go only to students who registered and were marked present.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ...result,
      message:
        result.issued > 0
          ? `Sent ${result.issued} certificate${result.issued === 1 ? "" : "s"}.`
          : "Every eligible attendee already has a certificate.",
    });
  } catch (err) {
    console.error("Failed to issue certificates:", err);
    return NextResponse.json(
      { error: "Failed to send certificates" },
      { status: 500 }
    );
  }
}
