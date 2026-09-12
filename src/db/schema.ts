import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";

// ============================================================
// ENUMS
// ============================================================

export const userRoleEnum = pgEnum("user_role", [
  "student",
  "faculty",
  "ceo",
  "cto",
  "to",
  "cfo",
  "fo",
  "cco",
  "co",
  "cio",
  "io",
  "cmo",
  "mo",
  "coo",
  "oo",
  "cso",
  "so",
  "cvo",
  "vo",
  "cwit",
  "wit",
  // Nodal Officer — highest authority in the portal (see src/lib/roles.ts).
  // Appended last so migrations stay a simple ALTER TYPE ... ADD VALUE.
  "nodal_officer",
]);

export const eventTypeEnum = pgEnum("event_type", [
  "workshop",
  "hackathon",
  "bootcamp",
  "seminar",
  "competition",
  "innovation_challenge",
]);

export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "ongoing",
  "completed",
  "cancelled",
]);

export const registrationRoleEnum = pgEnum("registration_role", [
  "participant",
  "volunteer",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "event_participation",
  "event_volunteer",
  "event_coordinator",
  "project_submission",
  "competition_winner",
  "workshop_completion",
  "startup_idea",
  "manual_award",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "pending",
  "approved",
  "rejected",
  "changes_requested",
]);

export const ideaStageEnum = pgEnum("idea_stage", [
  "submitted",
  "under_review",
  "approved",
  "incubated",
]);

export const opportunityTypeEnum = pgEnum("opportunity_type", [
  "internship",
  "hackathon",
  "competition",
  "grant",
  "startup_program",
]);

// ============================================================
// USERS (base identity table for all roles)
// ============================================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull().default(""),
    email: varchar("email", { length: 255 }).unique().notNull(),
    emailVerified: boolean("email_verified").default(false),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("student"),
    isActive: boolean("is_active").default(true),
    lastLogin: timestamp("last_login", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_users_email").on(table.email),
    index("idx_users_role").on(table.role),
  ]
);

// ============================================================
// BETTER AUTH TABLES
// ============================================================

export const sessions = pgTable("sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", {
    withTimezone: true,
  }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
    withTimezone: true,
  }),
  scope: text("scope"),
  idToken: text("id_token"),
  password: text("password"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// ALLOWED STAFF EMAILS (whitelist for non-student accounts)
// ============================================================

export const allowedStaffEmails = pgTable("allowed_staff_emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  role: userRoleEnum("role").notNull(),
  addedBy: uuid("added_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// ID COUNTERS (atomic sequential ID generation per dept+year)
// ============================================================

export const idCounters = pgTable("id_counters", {
  deptYear: varchar("dept_year", { length: 20 }).primaryKey(),
  count: integer("count").default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// STUDENT PROFILES
// ============================================================

export const studentProfiles = pgTable(
  "student_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    iecdId: varchar("iedc_id", { length: 25 }).unique().notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    admissionNumber: varchar("admission_number", { length: 50 })
      .unique()
      .notNull(),
    department: varchar("department", { length: 100 }).notNull(),
    batch: varchar("batch", { length: 9 }).notNull(),
    phone: varchar("phone", { length: 15 }),
    photoUrl: text("photo_url"),
    bio: text("bio"),
    skills: text("skills")
      .array()
      .default([]),
    interests: text("interests")
      .array()
      .default([]),
    linkedinUrl: text("linkedin_url"),
    githubUrl: text("github_url"),
    behanceUrl: text("behance_url"),
    portfolioUrl: text("portfolio_url"),
    qrCodeUrl: text("qr_code_url"),
    qrHmacSecret: varchar("qr_hmac_secret", { length: 64 }).notNull(),
    totalPoints: integer("total_points").default(0),
    isDeleted: boolean("is_deleted").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_student_dept").on(table.department),
    index("idx_student_batch").on(table.batch),
    index("idx_student_points").on(table.totalPoints),
  ]
);

// ============================================================
// FACULTY PROFILES
// ============================================================

export const facultyProfiles = pgTable("faculty_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  department: varchar("department", { length: 100 }),
  designation: varchar("designation", { length: 100 }),
  phone: varchar("phone", { length: 15 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// EVENTS
// ============================================================

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    eventType: eventTypeEnum("event_type").notNull(),
    venue: varchar("venue", { length: 255 }),
    startDatetime: timestamp("start_datetime", {
      withTimezone: true,
    }).notNull(),
    endDatetime: timestamp("end_datetime", { withTimezone: true }).notNull(),
    registrationDeadline: timestamp("registration_deadline", {
      withTimezone: true,
    }),
    registrationLimit: integer("registration_limit"),
    posterUrl: text("poster_url"),
    coordinatorId: uuid("coordinator_id").references(() => users.id),
    status: eventStatusEnum("status").default("draft"),
    participationPoints: integer("participation_points").default(10),
    volunteerPoints: integer("volunteer_points").default(20),
    isDeleted: boolean("is_deleted").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_events_status").on(table.status),
    index("idx_events_start").on(table.startDatetime),
    index("idx_events_coordinator").on(table.coordinatorId),
  ]
);

// ============================================================
// EVENT REGISTRATIONS
// ============================================================

export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    role: registrationRoleEnum("role").default("participant"),
    registeredAt: timestamp("registered_at", {
      withTimezone: true,
    }).defaultNow(),
    cancellationReason: text("cancellation_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uniq_event_student_reg").on(table.eventId, table.studentId),
    index("idx_reg_event").on(table.eventId),
    index("idx_reg_student").on(table.studentId),
  ]
);

// ============================================================
// EVENT ATTENDANCE
// ============================================================

export const eventAttendance = pgTable(
  "event_attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    scannedBy: uuid("scanned_by").references(() => users.id),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("uniq_event_student_att").on(table.eventId, table.studentId),
    index("idx_attendance_event").on(table.eventId),
    index("idx_attendance_student").on(table.studentId),
  ]
);

// ============================================================
// POINTS LOG (immutable audit trail)
// ============================================================

export const pointsLog = pgTable(
  "points_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    points: integer("points").notNull(),
    activityType: activityTypeEnum("activity_type").notNull(),
    referenceId: uuid("reference_id"),
    referenceType: varchar("reference_type", { length: 50 }),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).defaultNow(),
    awardedBy: uuid("awarded_by").references(() => users.id),
    note: text("note"),
  },
  (table) => [index("idx_points_student").on(table.studentId)]
);

// ============================================================
// PROJECTS
// ============================================================

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    githubUrl: text("github_url"),
    demoUrl: text("demo_url"),
    images: text("images")
      .array()
      .default([]),
    tags: text("tags")
      .array()
      .default([]),
    lookingForContributors: boolean("looking_for_contributors").default(false),
    contributorRoles: text("contributor_roles")
      .array()
      .default([]),
    contributorDescription: text("contributor_description"),
    status: projectStatusEnum("status").default("pending"),
    reviewComment: text("review_comment"),
    submittedBy: uuid("submitted_by").references(() => studentProfiles.id),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    isDeleted: boolean("is_deleted").default(false),
  },
  (table) => [
    index("idx_projects_status").on(table.status),
    index("idx_projects_submitter").on(table.submittedBy),
  ]
);

// ============================================================
// PROJECT TEAM MEMBERS
// ============================================================

export const projectTeamMembers = pgTable(
  "project_team_members",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 100 }).default("Member"),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.studentId] }),
  ]
);

// ============================================================
// PROJECT COLLABORATIONS (applications from interested students)
// ============================================================

export const projectCollaborations = pgTable(
  "project_collaborations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    applicantId: uuid("applicant_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    domain: varchar("domain", { length: 100 }).notNull(),
    message: text("message"),
    status: varchar("status", { length: 20 }).default("pending"),
    appliedAt: timestamp("applied_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("uniq_proj_applicant_domain").on(
      table.projectId,
      table.applicantId,
      table.domain
    ),
    index("idx_proj_collab_project").on(table.projectId),
    index("idx_proj_collab_applicant").on(table.applicantId),
  ]
);

// ============================================================
// BADGES
// ============================================================

export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 10 }),
  criteria: jsonb("criteria").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const studentBadges = pgTable(
  "student_badges",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => studentProfiles.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.studentId, table.badgeId] }),
  ]
);

// ============================================================
// CERTIFICATES
// ============================================================

/**
 * One row per issued certificate. The PDF itself is never stored — it is
 * re-rendered on demand from this row plus the event's template, so issuing a
 * batch costs one INSERT instead of hundreds of file writes.
 *
 * `recipientName` / `recipientDetail` snapshot the student as they were at
 * issue time: a certificate is a historical document and must not silently
 * change if the student later edits their profile.
 */
export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    certificateNumber: varchar("certificate_number", { length: 50 })
      .unique()
      .notNull(),
    studentId: uuid("student_id").references(() => studentProfiles.id),
    eventId: uuid("event_id").references(() => events.id),
    certificateUrl: text("certificate_url").notNull(),
    recipientName: varchar("recipient_name", { length: 255 }),
    recipientDetail: varchar("recipient_detail", { length: 255 }),
    issuedAt: timestamp("issued_at", { withTimezone: true }).defaultNow(),
    issuedBy: uuid("issued_by").references(() => users.id),
  },
  (table) => [
    // Guarantees re-running "Send certificates" can never double-issue.
    uniqueIndex("uniq_cert_event_student").on(table.eventId, table.studentId),
    index("idx_cert_student").on(table.studentId),
    index("idx_cert_event").on(table.eventId),
  ]
);

export const certIdCounter = pgTable("cert_id_counter", {
  year: integer("year").primaryKey(),
  count: integer("count").default(0),
});

// ============================================================
// EVENT CERTIFICATE TEMPLATES
// ============================================================

export const certificateTemplateModeEnum = pgEnum("certificate_template_mode", [
  "default",
  "custom",
]);

/**
 * Per-event certificate design. `default` renders the built-in IEDC layout;
 * `custom` draws the recipient's name (and optional class line) on top of an
 * uploaded artwork. Positions are percentages of the page so a template works
 * at any resolution or aspect ratio.
 */
export const eventCertificateTemplates = pgTable("event_certificate_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id")
    .notNull()
    .unique()
    .references(() => events.id, { onDelete: "cascade" }),
  mode: certificateTemplateModeEnum("mode").notNull().default("default"),
  /** Data URL of the uploaded artwork. Only read when mode = 'custom'. */
  backgroundUrl: text("background_url"),
  /** Heading on the built-in layout, e.g. "Certificate of Participation". */
  heading: varchar("heading", { length: 120 }),
  signatoryName: varchar("signatory_name", { length: 255 }),
  signatoryDesignation: varchar("signatory_designation", { length: 255 }),
  namePosX: integer("name_pos_x").default(50),
  namePosY: integer("name_pos_y").default(52),
  nameFontSize: integer("name_font_size").default(34),
  nameColor: varchar("name_color", { length: 9 }).default("#1A0D0C"),
  showDetailLine: boolean("show_detail_line").default(true),
  detailPosY: integer("detail_pos_y").default(45),
  detailFontSize: integer("detail_font_size").default(13),
  updatedBy: uuid("updated_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// INNOVATION IDEAS
// ============================================================

export const innovationIdeas = pgTable("innovation_ideas", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id").references(() => studentProfiles.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  stage: ideaStageEnum("stage").default("submitted"),
  attachments: text("attachments")
    .array()
    .default([]),
  reviewedBy: uuid("reviewed_by").references(() => users.id),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// TEAM FORMATION
// ============================================================

export const teamListings = pgTable("team_listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  skillsNeeded: text("skills_needed")
    .array()
    .default([]),
  postedBy: uuid("posted_by").references(() => studentProfiles.id),
  maxMembers: integer("max_members").default(4),
  isOpen: boolean("is_open").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const teamApplications = pgTable(
  "team_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => teamListings.id, { onDelete: "cascade" }),
    applicantId: uuid("applicant_id")
      .notNull()
      .references(() => studentProfiles.id),
    message: text("message"),
    status: varchar("status", { length: 20 }).default("pending"),
    appliedAt: timestamp("applied_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("uniq_listing_applicant").on(
      table.listingId,
      table.applicantId
    ),
  ]
);

// ============================================================
// OPPORTUNITIES BOARD
// ============================================================

export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  type: opportunityTypeEnum("type").notNull(),
  description: text("description"),
  link: text("link"),
  deadline: timestamp("deadline", { withTimezone: true }),
  postedBy: uuid("posted_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// EVENT FEEDBACK
// ============================================================

export const eventFeedback = pgTable(
  "event_feedback",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => studentProfiles.id),
    rating: integer("rating").notNull(),
    comments: text("comments"),
    submittedAt: timestamp("submitted_at", {
      withTimezone: true,
    }).defaultNow(),
  },
  (table) => [
    uniqueIndex("uniq_feedback_event_student").on(
      table.eventId,
      table.studentId
    ),
  ]
);

// ============================================================
// POINT RULES (configurable by Execom)
// ============================================================

export const pointRules = pgTable("point_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityType: activityTypeEnum("activity_type").unique().notNull(),
  points: integer("points").notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================
// NOTIFICATIONS
// ============================================================

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    type: varchar("type", { length: 50 }),
    referenceId: uuid("reference_id"),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("idx_notif_user").on(table.userId, table.isRead),
    index("idx_notif_time").on(table.createdAt),
  ]
);

// ============================================================
// TYPE EXPORTS
// ============================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type StudentProfile = typeof studentProfiles.$inferSelect;
export type NewStudentProfile = typeof studentProfiles.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
export type PointsLogEntry = typeof pointsLog.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type ProjectCollaboration = typeof projectCollaborations.$inferSelect;
export type Badge = typeof badges.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type EventCertificateTemplate =
  typeof eventCertificateTemplates.$inferSelect;
export type Notification = typeof notifications.$inferSelect;