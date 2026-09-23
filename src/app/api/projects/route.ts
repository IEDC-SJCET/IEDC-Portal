import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, studentProfiles, projectTeamMembers } from "@/db/schema";
import { eq, desc, and, or, isNull } from "drizzle-orm";
import { createProjectSchema } from "@/lib/validators";
import { NextResponse } from "next/server";
import { isAdminRole } from "@/lib/roles";
import { parsePagination } from "@/lib/request";
import { getCachedApprovedProjects, invalidateProjectsCache, listProjects } from "@/lib/projects-cache";

async function getSession() {
  return await auth.api.getSession({ headers: await headers() });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { page, limit } = parsePagination(searchParams, 50);
  const requestedStatus = searchParams.get("status") || "all";
  const my = searchParams.get("my") === "true";

  // Every projects listing is account-only: the rows carry the submitter's
  // name, department and (for staff) their admission number and IEDC ID.
  // API routes sit outside the proxy matcher, so this is the only guard.
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  /** Execom, the Nodal Officer and faculty review submissions; students browse them. */
  const isStaff = isAdminRole(role) || role === "faculty";

  if (my) {
    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id));

    if (!profile) {
      return NextResponse.json({ projects: [], page, limit });
    }

    const projectsList = await db
      .select()
      .from(projects)
      .where(
        and(
          or(eq(projects.isDeleted, false), isNull(projects.isDeleted)),
          eq(projects.submittedBy, profile.id)
        )
      )
      .orderBy(desc(projects.submittedAt))
      .limit(limit)
      .offset(page * limit);

    return NextResponse.json({ projects: projectsList, page, limit });
  }

  const projectsList = isStaff
    ? await listProjects(requestedStatus, true, page, limit)
    : await getCachedApprovedProjects(page, limit);

  return NextResponse.json({ projects: projectsList, page, limit });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createProjectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
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

  const { teamMembers, ...projectData } = parsed.data;

  const [project] = await db
    .insert(projects)
    .values({
      ...projectData,
      status: "pending",
      isDeleted: false,
      submittedBy: profile.id,
    })
    .returning();

  invalidateProjectsCache();

  // Add submitter as team member
  await db.insert(projectTeamMembers).values({
    projectId: project.id,
    studentId: profile.id,
    role: "Lead",
  });

  return NextResponse.json(project, { status: 201 });
}