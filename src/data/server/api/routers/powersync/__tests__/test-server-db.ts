import { PGlite } from '@electric-sql/pglite'
import { getTableName, sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api'

import * as schema from '@/data/server/db-schema'
import { ORG_ADMIN_IMMUTABLE_TRIGGER } from '@/data/server/db-schema/triggers'

let client: PGlite
let drizzleDb: ReturnType<typeof drizzle<typeof schema>>

// App tables in dependency-safe order (children before parents).
// Add new tables here when extending the server schema.
const SERVER_TABLES = [
  schema.maintenanceRecords,
  schema.maintenanceTemplates,
  schema.generatorSessions,
  schema.generatorUserAssignments,
  schema.generators,
  schema.invitations,
  schema.organizationMembers,
  schema.organizations,
  schema.user
]

export async function createTestServerDatabase() {
  client = new PGlite()
  drizzleDb = drizzle(client, { schema })

  await createTables()
  await applyTriggers()

  return { db: drizzleDb, client }
}

export async function resetServerDatabase() {
  const tableNames = SERVER_TABLES.map(t => `"${getTableName(t)}"`).join(', ')
  await drizzleDb.execute(sql.raw(`TRUNCATE TABLE ${tableNames} CASCADE`))
}

export async function closeServerDatabase() {
  await client.close()
}

// ── Triggers (cannot be expressed in Drizzle schema) ───────────────────────

async function applyTriggers() {
  await client.exec(ORG_ADMIN_IMMUTABLE_TRIGGER)
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
