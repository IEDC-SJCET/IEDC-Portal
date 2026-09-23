import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, pointsLog } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { reviewProjectSchema } from "@/lib/validators";
import { awardPoints } from "@/lib/points";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/roles";
import { invalidateProjectsCache } from "@/lib/projects-cache";

export async function PATCH(
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
  const body = await request.json();
  const parsed = reviewProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed" },
      { status: 400 }
    );
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id));

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(projects)
    .set({
      status: parsed.data.status,
      reviewComment: parsed.data.reviewComment !== undefined ? parsed.data.reviewComment : project.reviewComment,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning();

  invalidateProjectsCache();

  // Award points if approved — only once per project (idempotent)
  if (parsed.data.status === "approved" && project.submittedBy) {
    const [existing] = await db
      .select()
      .from(pointsLog)
      .where(
        and(
          eq(pointsLog.studentId, project.submittedBy),
          eq(pointsLog.activityType, "project_submission"),
          eq(pointsLog.referenceId, project.id)
        )
      );

    if (!existing) {
      await awardPoints({
        studentId: project.submittedBy,
        activityType: "project_submission",
        referenceId: project.id,
        referenceType: "project",
        awardedBy: session.user.id,
      });
    }
  }

  return NextResponse.json(updated);
}
