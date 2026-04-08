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
