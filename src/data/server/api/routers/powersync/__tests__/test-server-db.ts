import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'
import { sql } from 'drizzle-orm'

import * as schema from '@/data/server/db-schema'

let client: PGlite
let drizzleDb: ReturnType<typeof drizzle<typeof schema>>

export async function createTestServerDatabase() {
  client = new PGlite()
  drizzleDb = drizzle(client, { schema })

  await createTables()
  await applyTriggers()

  return { db: drizzleDb, client }
}

export async function resetServerDatabase() {
  // Truncate all app tables in dependency order (CASCADE handles FKs)
  await drizzleDb.execute(sql`
    TRUNCATE TABLE maintenance_records,
                   maintenance_templates,
                   generator_sessions,
                   generator_user_assignments,
                   generators,
                   invitations,
                   organization_members,
                   organizations,
                   "user"
    CASCADE
  `)
}

export async function closeServerDatabase() {
  await client.close()
}

// ── Triggers (cannot be expressed in Drizzle schema, from migration 0002) ───

async function applyTriggers() {
  await client.exec(`
    CREATE OR REPLACE FUNCTION validate_org_admin_immutable()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.admin_user_id IS DISTINCT FROM OLD.admin_user_id THEN
        RAISE EXCEPTION 'admin_user_id cannot be changed';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_validate_org_admin_immutable
      BEFORE UPDATE ON "organizations"
      FOR EACH ROW
      EXECUTE FUNCTION validate_org_admin_immutable();

    CREATE OR REPLACE FUNCTION validate_maintenance_template_trigger_fields()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.trigger_type IN ('hours', 'whichever_first')
         AND NEW.trigger_hours_interval IS NULL THEN
        RAISE EXCEPTION 'trigger_hours_interval is required when trigger_type is %',
          NEW.trigger_type;
      END IF;

      IF NEW.trigger_type IN ('calendar', 'whichever_first')
         AND NEW.trigger_calendar_days IS NULL THEN
        RAISE EXCEPTION 'trigger_calendar_days is required when trigger_type is %',
          NEW.trigger_type;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_validate_maintenance_template_fields
      BEFORE INSERT OR UPDATE ON "maintenance_templates"
      FOR EACH ROW
      EXECUTE FUNCTION validate_maintenance_template_trigger_fields();
  `)
}

// ── DDL from Drizzle schema ─────────────────────────────────────────────────

async function createTables() {
  const emptySnapshot = {
    version: '7' as const,
    dialect: 'postgresql' as const,
    id: '00000000-0000-0000-0000-000000000000',
    prevId: '',
    tables: {},
    views: {},
    enums: {},
    schemas: {},
    sequences: {},
    roles: {},
    policies: {},
    _meta: { tables: {}, columns: {}, schemas: {} }
  }

  const currentSnapshot = generateDrizzleJson(schema)
  const statements = await generateMigration(emptySnapshot, currentSnapshot)

  for (const stmt of statements) await client.exec(stmt)
}
