ALTER TABLE "users" ADD COLUMN "points" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_users_points" ON "users" USING btree ("points");--> statement-breakpoint
UPDATE "users" SET "points" = COALESCE("student_profiles"."total_points", 0) FROM "student_profiles" WHERE "student_profiles"."user_id" = "users"."id";