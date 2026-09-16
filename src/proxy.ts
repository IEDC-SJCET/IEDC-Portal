import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createClient as createSupabaseClient } from "@/utils/supabase/middleware";
import { db } from "@/db";
import { studentProfiles, allowedStaffEmails, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  EXECOM_ROLES,
  NODAL_OFFICER_ROLE,
  getDashboardForRole,
  isExecomRole,
  isNodalOfficer,
} from "@/lib/roles";
import { buildLoginUrl, getSafeRedirectPath, isPublicPath } from "@/lib/redirect";

const protectedRoutes: Record<string, string[]> = {
  "/student": ["student"],
  "/execom": [...EXECOM_ROLES],
  "/nodal": [NODAL_OFFICER_ROLE],
  "/faculty": ["faculty"],
};

const authRoutes = ["/auth/login", "/auth/register"];

export async function proxy(request: NextRequest) {
  const supabaseResponse = createSupabaseClient(request);
  const { pathname, search, searchParams } = request.nextUrl;

  // Check if this is an auth route
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  const returnTo = isAuthRoute
    ? getSafeRedirectPath(searchParams.get("redirectTo"))
    : getSafeRedirectPath(pathname + search);

  // Get session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If session is present, process automatic role updates & onboarding redirects
  if (session) {
    const email = session.user.email;
    const isCollegeEmail =
      email.endsWith("@sjcetpalai.ac.in") ||
      email.endsWith(".sjcetpalai.ac.in")
    if (!isCollegeEmail) {
      return NextResponse.redirect(
        new URL("/auth/login?error=Only SJCET college email IDs are allowed.", request.url)
      );
    }

    let role = (session.user as Record<string, unknown>).role as string;

    // 1. Auto-update whitelisted staff role upon first request/login
    //    Staff use top-level @sjcetpalai.ac.in accounts; students use @<dept>.sjcetpalai.ac.in.
    const emailDomain = email.split("@")[1] ?? "";
    if (role === "student" && emailDomain === "sjcetpalai.ac.in") {
      const [staff] = await db
        .select()
        .from(allowedStaffEmails)
        .where(eq(allowedStaffEmails.email, email));
      if (staff) {
        await db
          .update(users)
          .set({ role: staff.role })
          .where(eq(users.id, session.user.id));
        role = staff.role;
      }
    }

    // 2. Redirect student to onboarding page if they do not have a profile yet
    if (role === "student") {
      const [profile] = await db
        .select({ id: studentProfiles.id })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, session.user.id));

      const isOnboardingRoute =
        pathname === "/student/onboarding" || pathname === "/api/student/onboarding";

      if (!profile && !isOnboardingRoute) {
        const onboardingUrl = new URL("/student/onboarding", request.url);
        if (returnTo) onboardingUrl.searchParams.set("redirectTo", returnTo);
        return NextResponse.redirect(onboardingUrl);
      }

      if (profile && pathname === "/student/onboarding") {
        return NextResponse.redirect(new URL("/student/dashboard", request.url));
      }
    }
  }

  // If on auth route and already logged in, redirect to dashboard
  if (isAuthRoute && session) {
    const role = (session.user as Record<string, unknown>).role as string;
    const dashboardUrl = returnTo || getDashboardForRole(role);
    return NextResponse.redirect(new URL(dashboardUrl, request.url));
  }

  // Intercept specific event management & scan routes to allow chiefs and event volunteers.
  // Both the Execom and the Nodal Officer workspaces expose the same screens.
  const eventIdMatch = pathname.match(
    /^\/(execom|nodal)\/events\/([a-zA-Z0-9-]+)(?:\/scan)?$/
  );
  if (eventIdMatch) {
    const section = eventIdMatch[1];
    const eventId = eventIdMatch[2];
    if (eventId !== "create") {
      if (!session) {
        return NextResponse.redirect(new URL(buildLoginUrl(returnTo), request.url));
      }
      const role = (session.user as Record<string, unknown>).role as string;

      // The Nodal Officer owns the mirrored /nodal screens — send them there so the
      // workspace navigation stays consistent instead of failing the Execom check.
      if (section === "execom" && isNodalOfficer(role)) {
        return NextResponse.redirect(
          new URL(pathname.replace("/execom", "/nodal"), request.url)
        );
      }

      let allowed =
        section === "nodal" ? isNodalOfficer(role) : isExecomRole(role);

      if (!allowed && section === "execom") {
        const [profile] = await db
          .select({ id: studentProfiles.id })
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, session.user.id));

        if (profile) {
          const { eventRegistrations } = await import("@/db/schema");
          const { and, isNull } = await import("drizzle-orm");

          const [volunteerReg] = await db
            .select()
            .from(eventRegistrations)
            .where(
              and(
                eq(eventRegistrations.eventId, eventId),
                eq(eventRegistrations.studentId, profile.id),
                eq(eventRegistrations.role, "volunteer"),
                isNull(eventRegistrations.cancelledAt)
              )
            );
          if (volunteerReg) {
            allowed = true;
          }
        }
      }

      if (!allowed) {
        return NextResponse.redirect(new URL("/auth/login?error=Forbidden", request.url));
      }

      return supabaseResponse;
    }
  }

  // Check protected routes
  for (const [prefix, allowedRoles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(prefix)) {
      // Shared event links (listing + individual event) are viewable without an account.
      // Registering and every other feature still require login (enforced by the APIs).
      if (prefix === "/student" && isPublicPath(pathname)) {
        continue;
      }

      if (!session) {
        return NextResponse.redirect(new URL(buildLoginUrl(returnTo), request.url));
      }
      const role = (session.user as Record<string, unknown>).role as string;
      if (!allowedRoles.includes(role)) {
        // Every Execom screen is mirrored under /nodal, so keep the Nodal Officer on
        // the page they asked for instead of bouncing them to their dashboard.
        if (prefix === "/execom" && isNodalOfficer(role)) {
          return NextResponse.redirect(
            new URL(pathname.replace("/execom", "/nodal"), request.url)
          );
        }
        const dashboardUrl = getDashboardForRole(role);
        return NextResponse.redirect(new URL(dashboardUrl, request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/student/:path*",
    "/execom/:path*",
    "/nodal/:path*",
    "/faculty/:path*",
    "/auth/login",
    "/auth/register",
  ],
};