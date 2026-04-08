-- Drop hand-written CHECK constraints from migration 0002.
-- These are being moved into the Drizzle schema so drizzle-kit can manage them.
-- The next migration (auto-generated) will re-add them from the schema.

ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "chk_organizations_name_not_empty";--> statement-breakpoint
ALTER TABLE "generators" DROP CONSTRAINT IF EXISTS "chk_generators_name_not_empty";--> statement-breakpoint
ALTER TABLE "generators" DROP CONSTRAINT IF EXISTS "chk_generators_max_run_hours_positive";--> statement-breakpoint
ALTER TABLE "generators" DROP CONSTRAINT IF EXISTS "chk_generators_rest_hours_positive";--> statement-breakpoint
ALTER TABLE "generators" DROP CONSTRAINT IF EXISTS "chk_generators_warning_pct_range";--> statement-breakpoint
ALTER TABLE "maintenance_templates" DROP CONSTRAINT IF EXISTS "chk_templates_task_name_not_empty";--> statement-breakpoint
ALTER TABLE "maintenance_templates" DROP CONSTRAINT IF EXISTS "chk_templates_hours_interval_positive";--> statement-breakpoint
ALTER TABLE "maintenance_templates" DROP CONSTRAINT IF EXISTS "chk_templates_calendar_days_positive";--> statement-breakpoint
ALTER TABLE "invitations" DROP CONSTRAINT IF EXISTS "chk_invitations_email_not_empty";--> statement-breakpoint
DROP TRIGGER IF EXISTS "trg_validate_maintenance_template_fields" ON "maintenance_templates";--> statement-breakpoint
DROP FUNCTION IF EXISTS "validate_maintenance_template_trigger_fields";
