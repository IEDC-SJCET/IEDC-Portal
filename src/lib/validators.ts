import { z } from "zod";
import { ASSIGNABLE_ROLES, EXECOM_ROLES } from "@/lib/roles";

// ============================================================
// AUTH VALIDATORS
// ============================================================

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Confirm password must be at least 8 characters"),
  admissionNumber: z.string().min(1, "Admission number is required"),
  department: z.string().min(1, "Department is required"),
  batch: z.string().regex(/^\d{4}$/, "Graduation year must be a 4-digit number (e.g. 2027)"),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// ============================================================
// EVENT VALIDATORS
// ============================================================

export const createEventSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional().nullable(),
  eventType: z.enum([
    "workshop",
    "hackathon",
    "bootcamp",
    "seminar",
    "competition",
    "innovation_challenge",
    "techy_pedia",
    "wednesday_cafe",
    "gbm",
  ]),
  venue: z.string().optional().nullable(),
  startDatetime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid datetime"),
  endDatetime: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid datetime"),
  registrationDeadline: z.string().refine((val) => !val || !isNaN(Date.parse(val)), "Invalid datetime").optional().nullable(),
  registrationLimit: z.number().int().positive().optional().nullable(),
  participationPoints: z.number().int().default(10),
  volunteerPoints: z.number().int().default(20),
  posterUrl: z.string().optional().nullable(),
  volunteerEmails: z.array(z.string()).optional().nullable(),
  status: z
    .enum(["draft", "published", "ongoing", "completed", "cancelled"])
    .optional()
    .nullable(),
});

export const updateEventSchema = createEventSchema.partial().extend({
  status: z
    .enum(["draft", "published", "ongoing", "completed", "cancelled"])
    .optional()
    .nullable(),
  participationPoints: z.number().int().optional(),
  volunteerPoints: z.number().int().optional(),
});

// ============================================================
// PROJECT VALIDATORS
// ============================================================

export const createProjectSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  githubUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  demoUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  tags: z.array(z.string()).default([]),
  teamMembers: z.array(z.string()).default([]),
  lookingForContributors: z.boolean().optional().default(false),
  contributorRoles: z.array(z.string()).optional().default([]),
  contributorDescription: z.string().optional().nullable(),
});

export const reviewProjectSchema = z.object({
  status: z.enum(["approved", "rejected", "changes_requested"]),
  reviewComment: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const applyCollaborationSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  message: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  department: z.string().optional(),
  designation: z.string().optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  skills: z.array(z.string()).optional().nullable(),
  interests: z.array(z.string()).optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  githubUrl: z.string().optional().nullable(),
  behanceUrl: z.string().optional().nullable(),
  portfolioUrl: z.string().optional().nullable(),
});

// ============================================================
// FEEDBACK VALIDATORS
// ============================================================

export const eventFeedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comments: z.string().optional(),
});

// ============================================================
// STAFF MANAGEMENT VALIDATORS
// ============================================================

/**
 * Roles Execom may whitelist. Deliberately excludes `nodal_officer` — only a
 * sitting Nodal Officer may appoint another one, via `assignUserRoleSchema`.
 */
export const addStaffEmailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  role: z.enum(["faculty", ...EXECOM_ROLES]),
});

/**
 * Nodal Officer only: change the role of an account that already exists in the
 * portal. Covers every `user_role` value, including `nodal_officer` itself.
 */
export const assignUserRoleSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  role: z.enum(ASSIGNABLE_ROLES),
});

// ============================================================
// OPPORTUNITY VALIDATORS
// ============================================================

export const createOpportunitySchema = z.object({
  title: z.string().min(3),
  type: z.enum([
    "internship",
    "hackathon",
    "competition",
    "grant",
    "startup_program",
  ]),
  description: z.string().optional(),
  link: z.string().url().optional().or(z.literal("")),
  deadline: z.string().datetime().optional(),
});

// ============================================================
// CERTIFICATE VALIDATORS
// ============================================================

/** Accepts only inline PNG/JPEG artwork, capped so a huge upload cannot bloat a row. */
const certificateArtworkSchema = z
  .string()
  .regex(
    /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=\s]+$/i,
    "Template must be a PNG or JPEG image"
  )
  .max(8_000_000, "Template image is too large (max ~6MB)");

export const certificateTemplateSchema = z
  .object({
    mode: z.enum(["default", "custom"]),
    backgroundUrl: certificateArtworkSchema.nullable().optional(),
    heading: z.string().max(120).nullable().optional(),
    signatoryName: z.string().max(255).nullable().optional(),
    signatoryDesignation: z.string().max(255).nullable().optional(),
    namePosX: z.number().min(0).max(100).optional(),
    namePosY: z.number().min(0).max(100).optional(),
    nameFontSize: z.number().int().min(8).max(120).optional(),
    nameColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, "Colour must be a hex value like #1A0D0C")
      .optional(),
    showDetailLine: z.boolean().optional(),
    detailPosY: z.number().min(0).max(100).optional(),
    detailFontSize: z.number().int().min(6).max(60).optional(),
  })
  .refine((data) => data.mode !== "custom" || !!data.backgroundUrl, {
    message: "Upload a template image to use a custom certificate",
    path: ["backgroundUrl"],
  });

export type CertificateTemplateInput = z.infer<typeof certificateTemplateSchema>;

// ============================================================
// INNOVATION IDEA VALIDATORS
// ============================================================

export const createIdeaSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateEventInput = z.input<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type EventFeedbackInput = z.infer<typeof eventFeedbackSchema>;
export type AddStaffEmailInput = z.infer<typeof addStaffEmailSchema>;
export type AssignUserRoleInput = z.infer<typeof assignUserRoleSchema>;
export type CreateOpportunityInput = z.infer<typeof createOpportunitySchema>;
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;