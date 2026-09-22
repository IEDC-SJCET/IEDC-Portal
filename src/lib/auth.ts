import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { db } from "@/db";
import * as schema from "@/db/schema";

// Never derive the base URL from the (attacker-controllable) request Host
// header — always resolve to a fixed, trusted origin.
const getBaseURL = () =>
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

// `next build` instantiates this module without runtime env vars present, so
// only the build phase may fall back to the placeholder secret; any real
// runtime (dev/start/serverless) without BETTER_AUTH_SECRET fails loudly
// instead of silently signing sessions with a secret baked into the repo.
const authSecret = process.env.BETTER_AUTH_SECRET;
if (!authSecret && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
  throw new Error("BETTER_AUTH_SECRET environment variable is required.");
}

export const auth = betterAuth({
  secret:
    authSecret ||
    "a-temporary-secure-fallback-secret-for-production-build-time-only-32-chars",
  baseURL: getBaseURL(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      hd: "*",
      prompt: "select_account",
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "student",
        input: true,
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email;
          const isCollegeEmail =
            email.endsWith("@sjcetpalai.ac.in") ||
            email.endsWith(".sjcetpalai.ac.in");
          if (!isCollegeEmail) {
            throw new Error("Only SJCET college email IDs are allowed.");
          }
          return { data: user };
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
