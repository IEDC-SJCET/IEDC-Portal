import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, studentProfiles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateProjectSchema } from "@/lib/validators";
import { NextResponse } from "next/server";
import { invalidateProjectsCache } from "@/lib/projects-cache";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [profile] = await db
    .select()
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, session.user.id));

  if (!profile) {
    return NextResponse.json(
      { error: "Student profile not found" },
      { status: 404 }
    );
  }

  const { id } = await params;

  const [existing] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.submittedBy, profile.id)));

  if (!existing) {
    return NextResponse.json(
      { error: "Project not found or not owned by student" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const parsed = updateProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(projects)
    .set({
      ...parsed.data,
      status: "pending", // Reset status to pending for Execom re-review
      submittedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning();

  invalidateProjectsCache();

  return NextResponse.json(updated);
}