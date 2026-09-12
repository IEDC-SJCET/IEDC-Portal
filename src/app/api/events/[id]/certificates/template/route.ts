import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventCertificateTemplates, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isAdminRole } from "@/lib/roles";
import { certificateTemplateSchema } from "@/lib/validators";
import { loadTemplateConfig } from "@/lib/certificate-service";

/** Saves the certificate design for one event. Execom / Nodal Officer only. */
export async function PUT(
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

  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.id, id));
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = certificateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const message = Object.entries(fieldErrors)
      .map(([field, errs]) => `${field}: ${errs?.join(", ")}`)
      .join(" • ");
    return NextResponse.json(
      { error: message || "Validation failed" },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Switching back to the built-in design keeps the uploaded artwork on record so
  // the Execom can toggle between the two without re-uploading.
  const values = {
    eventId: id,
    mode: data.mode,
    backgroundUrl: data.backgroundUrl ?? null,
    heading: data.heading ?? null,
    signatoryName: data.signatoryName ?? null,
    signatoryDesignation: data.signatoryDesignation ?? null,
    namePosX: data.namePosX,
    namePosY: data.namePosY,
    nameFontSize: data.nameFontSize,
    nameColor: data.nameColor,
    showDetailLine: data.showDetailLine,
    detailPosY: data.detailPosY,
    detailFontSize: data.detailFontSize,
    updatedBy: session.user.id,
    updatedAt: new Date(),
  };

  try {
    await db
      .insert(eventCertificateTemplates)
      .values(values)
      .onConflictDoUpdate({
        target: eventCertificateTemplates.eventId,
        set: {
          mode: values.mode,
          backgroundUrl: values.backgroundUrl,
          heading: values.heading,
          signatoryName: values.signatoryName,
          signatoryDesignation: values.signatoryDesignation,
          namePosX: values.namePosX,
          namePosY: values.namePosY,
          nameFontSize: values.nameFontSize,
          nameColor: values.nameColor,
          showDetailLine: values.showDetailLine,
          detailPosY: values.detailPosY,
          detailFontSize: values.detailFontSize,
          updatedBy: values.updatedBy,
          updatedAt: values.updatedAt,
        },
      });

    const template = await loadTemplateConfig(id);
    return NextResponse.json({ template, message: "Certificate template saved" });
  } catch (err) {
    console.error("Failed to save certificate template:", err);
    return NextResponse.json(
      { error: "Failed to save certificate template" },
      { status: 500 }
    );
  }
}
