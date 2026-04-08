CREATE TYPE "public"."trigger_type" AS ENUM('hours', 'calendar', 'whichever_first');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generator_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generator_id" uuid NOT NULL,
	"started_by_user_id" text NOT NULL,
	"stopped_by_user_id" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"stopped_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "generator_user_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generator_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generator_user_assignments_generator_user_unique" UNIQUE("generator_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "generators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"model" text NOT NULL,
	"description" text,
	"max_consecutive_run_hours" real NOT NULL,
	"required_rest_hours" real NOT NULL,
	"run_warning_threshold_pct" integer DEFAULT 80 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_generators_title_not_empty" CHECK (length(trim("title")) > 0),
	CONSTRAINT "chk_generators_max_run_hours_positive" CHECK ("max_consecutive_run_hours" > 0),
	CONSTRAINT "chk_generators_rest_hours_positive" CHECK ("required_rest_hours" > 0),
	CONSTRAINT "chk_generators_warning_pct_range" CHECK ("run_warning_threshold_pct" BETWEEN 1 AND 100)
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invitee_email" text NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_org_email_unique" UNIQUE("organization_id","invitee_email"),
	CONSTRAINT "chk_invitations_email_not_empty" CHECK (length(trim("invitee_email")) > 0)
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_members_org_user_unique" UNIQUE("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"admin_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_organizations_name_not_empty" CHECK (length(trim("name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "maintenance_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"generator_id" uuid NOT NULL,
	"performed_by_user_id" text NOT NULL,
	"performed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "maintenance_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generator_id" uuid NOT NULL,
	"task_name" text NOT NULL,
	"description" text,
	"trigger_type" "trigger_type" NOT NULL,
	"trigger_hours_interval" real,
	"trigger_calendar_days" integer,
	"is_one_time" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trigger_fields_match_type" CHECK ((trigger_type = 'hours' AND trigger_hours_interval IS NOT NULL) OR (trigger_type = 'calendar' AND trigger_calendar_days IS NOT NULL) OR (trigger_type = 'whichever_first' AND trigger_hours_interval IS NOT NULL AND trigger_calendar_days IS NOT NULL)),
	CONSTRAINT "chk_templates_task_name_not_empty" CHECK (length(trim("task_name")) > 0),
	CONSTRAINT "chk_templates_hours_interval_positive" CHECK ("trigger_hours_interval" IS NULL OR "trigger_hours_interval" > 0),
	CONSTRAINT "chk_templates_calendar_days_positive" CHECK ("trigger_calendar_days" IS NULL OR "trigger_calendar_days" > 0)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generator_sessions" ADD CONSTRAINT "generator_sessions_generator_id_generators_id_fk" FOREIGN KEY ("generator_id") REFERENCES "public"."generators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generator_sessions" ADD CONSTRAINT "generator_sessions_started_by_user_id_user_id_fk" FOREIGN KEY ("started_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generator_sessions" ADD CONSTRAINT "generator_sessions_stopped_by_user_id_user_id_fk" FOREIGN KEY ("stopped_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generator_user_assignments" ADD CONSTRAINT "generator_user_assignments_generator_id_generators_id_fk" FOREIGN KEY ("generator_id") REFERENCES "public"."generators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generator_user_assignments" ADD CONSTRAINT "generator_user_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generators" ADD CONSTRAINT "generators_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_user_id_user_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_admin_user_id_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_template_id_maintenance_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."maintenance_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_generator_id_generators_id_fk" FOREIGN KEY ("generator_id") REFERENCES "public"."generators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_performed_by_user_id_user_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_templates" ADD CONSTRAINT "maintenance_templates_generator_id_generators_id_fk" FOREIGN KEY ("generator_id") REFERENCES "public"."generators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "generator_sessions_generator_id_idx" ON "generator_sessions" USING btree ("generator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generator_sessions_one_active_per_generator" ON "generator_sessions" USING btree ("generator_id") WHERE "stopped_at" IS NULL;--> statement-breakpoint
CREATE INDEX "generators_organization_id_idx" ON "generators" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitations_invitee_email_idx" ON "invitations" USING btree ("invitee_email");--> statement-breakpoint
CREATE INDEX "organization_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organizations_admin_user_id_idx" ON "organizations" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "maintenance_records_generator_id_idx" ON "maintenance_records" USING btree ("generator_id");--> statement-breakpoint
CREATE INDEX "maintenance_records_template_id_idx" ON "maintenance_records" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "maintenance_templates_generator_id_idx" ON "maintenance_templates" USING btree ("generator_id");