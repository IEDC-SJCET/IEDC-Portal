import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "@/db";
import { projects, studentProfiles } from "@/db/schema";
import { and, desc, eq, isNull, or } from "drizzle-orm";

/**
 * Projects listing. The student "browse" view (approved projects, no staff-only
 * columns) is identical for every student, so it is cached in the Next.js Data
 * Cache. Staff listings expose admission numbers and non-approved submissions,
 * so they are always read fresh and never share a cache entry with students.
 */
export const PROJECTS_CACHE_TAG = "projects";

/**
 * Safety net only: every write to `projects` calls `invalidateProjectsCache()`.
 * Bounds staleness of the submitter's name/department, which come from their
 * student profile.
 */
const PROJECTS_CACHE_REVALIDATE_SECONDS = 60;

export async function listProjects(
  status: string,
  isStaff: boolean,
  page: number,
  limit: number
) {
  const whereConditions = [
    or(eq(projects.isDeleted, false), isNull(projects.isDeleted)),
  ];

  if (status !== "all") {
    whereConditions.push(
      eq(
        projects.status,
        status as "pending" | "approved" | "rejected" | "changes_requested"
      )
    );
  }

  return db
    .select({
      id: projects.id,
      title: projects.title,
      description: projects.description,
      githubUrl: projects.githubUrl,
      demoUrl: projects.demoUrl,
      tags: projects.tags,
      lookingForContributors: projects.lookingForContributors,
      contributorRoles: projects.contributorRoles,
      contributorDescription: projects.contributorDescription,
      status: projects.status,
      reviewComment: projects.reviewComment,
      submittedAt: projects.submittedAt,
      submittedBy: projects.submittedBy,
      studentName: studentProfiles.name,
      department: studentProfiles.department,
      ...(isStaff
        ? {
          admissionNumber: studentProfiles.admissionNumber,
          iecdId: studentProfiles.iecdId,
          batch: studentProfiles.batch,
        }
        : {}),
    })
    .from(projects)
    .leftJoin(studentProfiles, eq(projects.submittedBy, studentProfiles.id))
    .where(and(...whereConditions))
    .orderBy(desc(projects.submittedAt))
    .limit(limit)
    .offset(page * limit);
}

/** Approved projects as students see them. Dates are ISO strings, as in the JSON response. */
export const getCachedApprovedProjects = unstable_cache(
  async (page: number, limit: number) => {
    const rows = await listProjects("approved", false, page, limit);
    return rows.map((row) => ({
      ...row,
      submittedAt: row.submittedAt?.toISOString() ?? null,
    }));
  },
  ["projects-approved"],
  { tags: [PROJECTS_CACHE_TAG], revalidate: PROJECTS_CACHE_REVALIDATE_SECONDS }
);

/** Call after any write to the `projects` table. Expires immediately. */
export function invalidateProjectsCache() {
  revalidateTag(PROJECTS_CACHE_TAG, { expire: 0 });
}
