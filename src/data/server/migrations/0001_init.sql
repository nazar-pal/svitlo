CREATE TYPE "public"."trigger_type" AS ENUM('hours', 'calendar', 'whichever_first');--> statement-breakpoint
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
	"name" text NOT NULL,
	"generator_type" text NOT NULL,
	"description" text,
	"max_consecutive_run_hours" real NOT NULL,
	"required_rest_hours" real NOT NULL,
	"run_warning_threshold_pct" integer DEFAULT 80 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"invitee_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invitations_org_email_unique" UNIQUE("organization_id","invitee_email")
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generator_sessions" ADD CONSTRAINT "generator_sessions_generator_id_generators_id_fk" FOREIGN KEY ("generator_id") REFERENCES "public"."generators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generator_sessions" ADD CONSTRAINT "generator_sessions_started_by_user_id_user_id_fk" FOREIGN KEY ("started_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generator_sessions" ADD CONSTRAINT "generator_sessions_stopped_by_user_id_user_id_fk" FOREIGN KEY ("stopped_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generator_user_assignments" ADD CONSTRAINT "generator_user_assignments_generator_id_generators_id_fk" FOREIGN KEY ("generator_id") REFERENCES "public"."generators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generator_user_assignments" ADD CONSTRAINT "generator_user_assignments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generators" ADD CONSTRAINT "generators_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_template_id_maintenance_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."maintenance_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_generator_id_generators_id_fk" FOREIGN KEY ("generator_id") REFERENCES "public"."generators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_performed_by_user_id_user_id_fk" FOREIGN KEY ("performed_by_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_templates" ADD CONSTRAINT "maintenance_templates_generator_id_generators_id_fk" FOREIGN KEY ("generator_id") REFERENCES "public"."generators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_admin_user_id_user_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generator_sessions_generator_id_idx" ON "generator_sessions" USING btree ("generator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generator_sessions_one_active_per_generator" ON "generator_sessions" USING btree ("generator_id") WHERE "stopped_at" IS NULL;--> statement-breakpoint
CREATE INDEX "generators_organization_id_idx" ON "generators" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "maintenance_records_generator_id_idx" ON "maintenance_records" USING btree ("generator_id");--> statement-breakpoint
CREATE INDEX "maintenance_records_template_id_idx" ON "maintenance_records" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "maintenance_templates_generator_id_idx" ON "maintenance_templates" USING btree ("generator_id");--> statement-breakpoint
CREATE INDEX "invitations_invitee_email_idx" ON "invitations" USING btree ("invitee_email");--> statement-breakpoint
CREATE INDEX "organization_members_user_id_idx" ON "organization_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organizations_admin_user_id_idx" ON "organizations" USING btree ("admin_user_id");