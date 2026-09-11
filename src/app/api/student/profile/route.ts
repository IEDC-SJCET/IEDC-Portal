import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { studentProfiles, facultyProfiles, users, eventAttendance, projects, certificates } from "@/db/schema";
import { eq, count, or } from "drizzle-orm";
import { generateIEDCId, getDeptCode } from "@/lib/iedc-id";
import { generateQRDataURL } from "@/lib/qr";
import { NextResponse } from "next/server";
import { getRoleLabel, isAdminRole, isNodalOfficer } from "@/lib/roles";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isUUID = (val: string | null): val is string => {
  return typeof val === "string" && UUID_REGEX.test(val);
};

/** Display designation for staff accounts that have no profile designation yet. */
function defaultDesignationFor(role: string): string {
  if (isNodalOfficer(role)) return getRoleLabel(role);
  if (role === "cto") return "CTO (Chief Technical Officer)";
  return `${role.toUpperCase()} Member`;
}

async function getSession() {
  return await auth.api.getSession({ headers: await headers() });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const targetId = searchParams.get("id");
  const targetIecdId = searchParams.get("iecdId");

  if (targetId || targetIecdId) {
    if (targetId && !isUUID(targetId)) {
      return NextResponse.json({ error: "Invalid profile ID format" }, { status: 400 });
    }

    const [profile] = await db
      .select()
      .from(studentProfiles)
      .where(
        targetId
          ? or(eq(studentProfiles.id, targetId), eq(studentProfiles.userId, targetId))
          : eq(studentProfiles.iecdId, targetIecdId!)
      );

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const [[eventsRes], [projectsRes], [certsRes]] = await Promise.all([
      db.select({ count: count() }).from(eventAttendance).where(eq(eventAttendance.studentId, profile.id)),
      db.select({ count: count() }).from(projects).where(eq(projects.submittedBy, profile.id)),
      db.select({ count: count() }).from(certificates).where(eq(certificates.studentId, profile.id)),
    ]);

    let userRole = "student";
    let userPhoto = profile.photoUrl;

    if (profile.userId) {
      const [u] = await db
        .select({ role: users.role, image: users.image })
        .from(users)
        .where(eq(users.id, profile.userId));
      if (u?.role) userRole = u.role;
      if (!userPhoto && u?.image) userPhoto = u.image;
    }

    const { qrHmacSecret, isDeleted, ...safe } = profile;
    return NextResponse.json({
      ...safe,
      id: profile.id,
      photoUrl: userPhoto || null,
      role: userRole,
      eventsParticipatedCount: Number(eventsRes?.count || 0),
      projectsCount: Number(projectsRes?.count || 0),
      certificatesCount: Number(certsRes?.count || 0),
    });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;

  if (role === "student") {
    let [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id));

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const [[eventsRes], [projectsRes], [certsRes]] = await Promise.all([
      db.select({ count: count() }).from(eventAttendance).where(eq(eventAttendance.studentId, profile.id)),
      db.select({ count: count() }).from(projects).where(eq(projects.submittedBy, profile.id)),
      db.select({ count: count() }).from(certificates).where(eq(certificates.studentId, profile.id)),
    ]);

    const { qrHmacSecret, isDeleted, ...safe } = profile;
    return NextResponse.json({
      ...safe,
      id: profile.id,
      role,
      eventsParticipatedCount: Number(eventsRes?.count || 0),
      projectsCount: Number(projectsRes?.count || 0),
      certificatesCount: Number(certsRes?.count || 0),
    });

  } else if (role === "faculty") {
    let [profile] = await db
      .select()
      .from(facultyProfiles)
      .where(eq(facultyProfiles.userId, session.user.id));

    if (!profile) {
      [profile] = await db
        .insert(facultyProfiles)
        .values({ userId: session.user.id, name: session.user.name, phone: "", department: "", designation: "" })
        .returning();
    }

    const { id, userId, ...safe } = profile;
    return NextResponse.json({ ...safe, role, email: session.user.email });

  } else {
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
    const userName = (user?.name && user.name !== "User" && user.name !== "")
      ? user.name
      : (role === "cto" ? "Tims Tittus" : (session.user.name || (isNodalOfficer(role) ? "Nodal Officer" : "Execom User")));

    if (role === "cto" && (!user?.name || user.name === "User" || user.name === "")) {
      await db.update(users).set({ name: "Tims Tittus" }).where(eq(users.id, session.user.id));
    }

    let [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id));

    if (!profile) {
      const roleUpper = role.toUpperCase();
      const defaultIecdId = await generateIEDCId(roleUpper, 2026);
      const staffPrefix = isNodalOfficer(role) ? "NODAL" : "EXECOM";
      const defaultAdmissionNumber = `${staffPrefix}-${roleUpper}-${session.user.id.slice(0, 6).toUpperCase()}`;

      try {
        const [newProfile] = await db
          .insert(studentProfiles)
          .values({
            userId: session.user.id,
            iecdId: defaultIecdId,
            name: userName,
            admissionNumber: defaultAdmissionNumber,
            department: "CSE",
            batch: "2026",
            phone: "",
            bio: isNodalOfficer(role)
              ? "Nodal Officer at IEDC SJCET"
              : role === "cto"
                ? "Chief Technical Officer at IEDC SJCET"
                : `Execom Member (${roleUpper}) at IEDC SJCET`,
            qrHmacSecret: crypto.randomUUID(),
          })
          .returning();
        profile = newProfile;
      } catch {
        // Fallback if insertion hits unique constraint
        [profile] = await db
          .select()
          .from(studentProfiles)
          .where(eq(studentProfiles.userId, session.user.id));
      }
    }

    if (profile) {
      const [[eventsRes], [projectsRes], [certsRes]] = await Promise.all([
        db.select({ count: count() }).from(eventAttendance).where(eq(eventAttendance.studentId, profile.id)),
        db.select({ count: count() }).from(projects).where(eq(projects.submittedBy, profile.id)),
        db.select({ count: count() }).from(certificates).where(eq(certificates.studentId, profile.id)),
      ]);

      const { qrHmacSecret, isDeleted, ...safe } = profile;
      return NextResponse.json({
        ...safe,
        id: profile.id,
        userId: profile.userId,
        name: userName,
        role,
        designation: profile.bio || defaultDesignationFor(role),
        eventsParticipatedCount: Number(eventsRes?.count || 0),
        projectsCount: Number(projectsRes?.count || 0),
        certificatesCount: Number(certsRes?.count || 0),
      });
    }

    return NextResponse.json({
      id: session.user.id,
      userId: session.user.id,
      name: userName,
      email: user?.email || session.user.email,
      role,
      designation: defaultDesignationFor(role),
      department: "CSE",
      batch: "2026",
      iecdId: `IEDC-2026-${role.toUpperCase()}-00001`,
      totalPoints: 0,
      eventsAttended: 0,
    });
  }
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as Record<string, unknown>).role as string;
  const body = await request.json();

  if (role === "student" || role === "faculty" || isAdminRole(role)) {
    if (body.name && typeof body.name === "string" && body.name.trim()) {
      await db
        .update(users)
        .set({ name: body.name.trim() })
        .where(eq(users.id, session.user.id));
    }

    let [profile] = await db
      .select()
      .from(studentProfiles)
      .where(eq(studentProfiles.userId, session.user.id));

    const updateData: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) updateData.name = body.name.trim();
    if (typeof body.phone === "string") updateData.phone = body.phone.trim() || null;
    if (typeof body.bio === "string") updateData.bio = body.bio.trim() || null;
    if (typeof body.githubUrl === "string") updateData.githubUrl = body.githubUrl.trim() || null;
    if (typeof body.linkedinUrl === "string") updateData.linkedinUrl = body.linkedinUrl.trim() || null;
    if (typeof body.behanceUrl === "string") updateData.behanceUrl = body.behanceUrl.trim() || null;
    if (typeof body.portfolioUrl === "string") updateData.portfolioUrl = body.portfolioUrl.trim() || null;

    if (typeof body.department === "string" && body.department.trim()) {
      const newDept = body.department.trim();
      updateData.department = newDept;

      if (profile) {
        const oldCode = getDeptCode(profile.department || "");
        const newCode = getDeptCode(newDept);

        if (oldCode !== newCode || !profile.iecdId?.includes(`-${newCode}-`)) {
          const yearParts = (profile.batch || "2027").split("-");
          const gradYear = parseInt(yearParts[1] || yearParts[0]) || 2027;
          const newIecdId = await generateIEDCId(newDept, gradYear);
          updateData.iecdId = newIecdId;

          if (profile.qrHmacSecret) {
            const qrCodeUrl = await generateQRDataURL(profile.id, newIecdId, profile.qrHmacSecret);
            updateData.qrCodeUrl = qrCodeUrl;
          }
        }
      }
    }

    if (profile) {
      const [updated] = await db
        .update(studentProfiles)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(studentProfiles.userId, session.user.id))
        .returning();
      profile = updated;
    } else if (role !== "faculty") {
      const roleUpper = role.toUpperCase();
      const newIecdId = await generateIEDCId(roleUpper, 2026);
      const [inserted] = await db
        .insert(studentProfiles)
        .values({
          userId: session.user.id,
          iecdId: newIecdId,
          name: (body.name as string)?.trim() || session.user.name || "Execom User",
          admissionNumber: `EXECOM-${roleUpper}-${session.user.id.slice(0, 6).toUpperCase()}`,
          department: (body.department as string)?.trim() || "CSE",
          batch: "2026",
          phone: (body.phone as string)?.trim() || "",
          bio: (body.bio as string)?.trim() || (role === "cto" ? "Chief Technical Officer at IEDC SJCET" : `Execom Member at IEDC SJCET`),
          githubUrl: (body.githubUrl as string)?.trim() || null,
          linkedinUrl: (body.linkedinUrl as string)?.trim() || null,
          behanceUrl: (body.behanceUrl as string)?.trim() || null,
          portfolioUrl: (body.portfolioUrl as string)?.trim() || null,
          qrHmacSecret: crypto.randomUUID(),
        })
        .returning();
      profile = inserted;
    }

    if (profile) {
      const { id, userId, qrHmacSecret, qrCodeUrl, isDeleted, ...safe } = profile;
      return NextResponse.json({
        ...safe,
        role,
        designation: profile.bio || defaultDesignationFor(role),
      });
    }

    return NextResponse.json({ message: "Profile updated" });
  }

  return NextResponse.json({ message: "Profile updated" });
}