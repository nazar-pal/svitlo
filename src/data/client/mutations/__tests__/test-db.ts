import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import {
  generateSQLiteDrizzleJson,
  generateSQLiteMigration
} from 'drizzle-kit/api'

import * as schema from '@/data/client/db-schema'

let sqlite: Database.Database
let drizzleDb: ReturnType<typeof drizzle>

export async function createTestDatabase() {
  sqlite = new Database(':memory:')
  await createTables(sqlite)
  applyServerConstraints(sqlite)

  drizzleDb = drizzle(sqlite, { schema })

  return {
    db: drizzleDb,
    powersync: createPowerSyncShim(sqlite),
    sqlite
  }
}

export function resetDatabase() {
  const tables = [
    'maintenance_records',
    'maintenance_templates',
    'generator_sessions',
    'generator_user_assignments',
    'generators',
    'invitations',
    'organization_members',
    'organizations',
    'user'
  ]
  for (const table of tables) sqlite.exec(`DELETE FROM ${table}`)
}

export function closeDatabase() {
  sqlite.close()
}

// ── PowerSync writeTransaction shim ─────────────────────────────────────────

interface TransactionContext {
  execute: (query: string, params?: unknown[]) => Promise<void>
  getOptional: <R>(query: string, params?: unknown[]) => Promise<R | null>
}

function createPowerSyncShim(db: Database.Database) {
  return {
    writeTransaction: async <T>(
      fn: (tx: TransactionContext) => Promise<T>
    ): Promise<T> => {
      db.exec('BEGIN')
      try {
        const tx: TransactionContext = {
          execute: async (query, params) => {
            db.prepare(query).run(...(params ?? []))
          },
          getOptional: async <R>(
            query: string,
            params?: unknown[]
          ): Promise<R | null> => {
            const row = db.prepare(query).get(...(params ?? []))
            return (row as R) ?? null
          }
        }
        const result = await fn(tx)
        db.exec('COMMIT')
        return result
      } catch (e) {
        db.exec('ROLLBACK')
        throw e
      }
    }
  }
}

// ── Server-parity constraints (unique indexes that the server enforces) ─────

function applyServerConstraints(db: Database.Database) {
  db.exec(`
    CREATE UNIQUE INDEX "generator_user_assignments_generator_user_unique"
      ON "generator_user_assignments" ("generator_id", "user_id");

    CREATE UNIQUE INDEX "organization_members_org_user_unique"
      ON "organization_members" ("organization_id", "user_id");

    CREATE UNIQUE INDEX "invitations_org_email_unique"
      ON "invitations" ("organization_id", "invitee_email");

    CREATE UNIQUE INDEX "generator_sessions_one_active_per_generator"
      ON "generator_sessions" ("generator_id")
      WHERE "stopped_at" IS NULL;

    CREATE UNIQUE INDEX "user_email_unique"
      ON "user" ("email");
  `)
}

// ── DDL from Drizzle schema ─────────────────────────────────────────────────

async function createTables(db: Database.Database) {
  const emptySnapshot = {
    version: '6',
    dialect: 'sqlite' as const,
    id: '00000000-0000-0000-0000-000000000000',
    prevId: '',
    tables: {},
    views: {},
    enums: {},
    _meta: { tables: {}, columns: {} }
  }

  const currentSnapshot = await generateSQLiteDrizzleJson(schema)
  const statements = await generateSQLiteMigration(
    emptySnapshot,
    currentSnapshot
  )

  for (const stmt of statements) db.exec(stmt)
}
