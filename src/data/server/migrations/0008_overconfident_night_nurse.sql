ALTER TABLE "generators" ADD CONSTRAINT "chk_generators_title_not_empty" CHECK (length(trim("title")) > 0);--> statement-breakpoint
ALTER TABLE "generators" ADD CONSTRAINT "chk_generators_max_run_hours_positive" CHECK ("max_consecutive_run_hours" > 0);--> statement-breakpoint
ALTER TABLE "generators" ADD CONSTRAINT "chk_generators_rest_hours_positive" CHECK ("required_rest_hours" > 0);--> statement-breakpoint
ALTER TABLE "generators" ADD CONSTRAINT "chk_generators_warning_pct_range" CHECK ("run_warning_threshold_pct" BETWEEN 1 AND 100);--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "chk_invitations_email_not_empty" CHECK (length(trim("invitee_email")) > 0);--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "chk_organizations_name_not_empty" CHECK (length(trim("name")) > 0);--> statement-breakpoint
ALTER TABLE "maintenance_templates" ADD CONSTRAINT "chk_templates_task_name_not_empty" CHECK (length(trim("task_name")) > 0);--> statement-breakpoint
ALTER TABLE "maintenance_templates" ADD CONSTRAINT "chk_templates_hours_interval_positive" CHECK ("trigger_hours_interval" IS NULL OR "trigger_hours_interval" > 0);--> statement-breakpoint
ALTER TABLE "maintenance_templates" ADD CONSTRAINT "chk_templates_calendar_days_positive" CHECK ("trigger_calendar_days" IS NULL OR "trigger_calendar_days" > 0);