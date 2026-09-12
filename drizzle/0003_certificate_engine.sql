CREATE TYPE "public"."certificate_template_mode" AS ENUM('default', 'custom');--> statement-breakpoint
CREATE TABLE "event_certificate_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"mode" "certificate_template_mode" DEFAULT 'default' NOT NULL,
	"background_url" text,
	"heading" varchar(120),
	"signatory_name" varchar(255),
	"signatory_designation" varchar(255),
	"name_pos_x" integer DEFAULT 50,
	"name_pos_y" integer DEFAULT 52,
	"name_font_size" integer DEFAULT 34,
	"name_color" varchar(9) DEFAULT '#1A0D0C',
	"show_detail_line" boolean DEFAULT true,
	"detail_pos_y" integer DEFAULT 45,
	"detail_font_size" integer DEFAULT 13,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "event_certificate_templates_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "recipient_name" varchar(255);--> statement-breakpoint
ALTER TABLE "certificates" ADD COLUMN "recipient_detail" varchar(255);--> statement-breakpoint
ALTER TABLE "event_certificate_templates" ADD CONSTRAINT "event_certificate_templates_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_certificate_templates" ADD CONSTRAINT "event_certificate_templates_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_cert_event_student" ON "certificates" USING btree ("event_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_cert_student" ON "certificates" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_cert_event" ON "certificates" USING btree ("event_id");