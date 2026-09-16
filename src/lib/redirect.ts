export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/student/events" ||
    /^\/student\/events\/[a-zA-Z0-9-]+$/.test(pathname)
  );
}

export function getSafeRedirectPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/")) return null;
  if (/[\x00-\x1f\x7f]/.test(value)) return null;
  if (value.startsWith("//") || value.includes("\\")) return null;
  if (value === "/auth" || value.startsWith("/auth/") || value.startsWith("/auth?")) return null;
  return value;
}

export function buildLoginUrl(path: string | null | undefined): string {
  const safe = getSafeRedirectPath(path);
  return safe ? `/auth/login?redirectTo=${encodeURIComponent(safe)}` : "/auth/login";
}