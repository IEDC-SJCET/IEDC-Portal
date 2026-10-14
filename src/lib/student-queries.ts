// Client-side TanStack Query keys and helpers for the student portal.
// The QueryClient lives in the student layout (see QueryProvider), so this
// cache is per browser tab and per signed-in user — never shared server-side.

export const studentQueryKeys = {
  profile: ["student", "profile"] as const,
  events: ["student", "events"] as const,
  eventList: (url: string) => ["student", "events", url] as const,
  leaderboard: (scope: string) => ["student", "leaderboard", scope] as const,
  projectLists: ["student", "projects"] as const,
  projectList: (view: "browse" | "my") => ["student", "projects", view] as const,
  myApplications: ["student", "project-applications"] as const,
  badges: ["student", "badges"] as const,
  certificates: ["student", "certificates"] as const,
  githubRepos: (username: string) => ["github-repos", username] as const,
};

// Overrides of the 60s default staleTime for data that changes rarely.
export const STUDENT_STALE_TIMES = {
  events: 5 * 60 * 1000,
  approvedProjects: 5 * 60 * 1000,
  githubRepos: 10 * 60 * 1000,
};

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Request to ${url} failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}