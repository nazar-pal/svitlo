import Database from 'better-sqlite3'
import {
  generateDrizzleJson,
  generateSQLiteDrizzleJson,
  generateSQLiteMigration
} from 'drizzle-kit/api'
import { getTableName, is } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'

import * as clientSchema from '@/data/client/db-schema'
import * as serverSchema from '@/data/server/db-schema'

// Auto-derived from schema exports. No manual sync needed.
const CLIENT_TABLES = Object.values(clientSchema).filter(v =>
  is(v, SQLiteTable)
)

export async function createTestDatabase() {
  const sqlite = new Database(':memory:')
  await createTables(sqlite)
  applyServerConstraints(sqlite)

  const db = drizzle(sqlite, { schema: clientSchema })

  return {
    sqlite,
    db,
    powersync: createPowerSyncShim(sqlite)
  }
}

export function resetDatabase(sqlite: Database.Database) {
  for (const table of CLIENT_TABLES)
    sqlite.exec(`DELETE FROM "${getTableName(table)}"`)
}

export function closeDatabase(sqlite: Database.Database) {
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

// ── Server-parity constraints ───────────────────────────────────────────────
// Derived automatically from the server Drizzle schema via drizzle-kit snapshot.
// When you add/modify/remove a unique constraint or index in the server schema,
// it propagates here with zero manual sync.

interface SnapshotUniqueConstraint {
  name: string
  columns: string[]
}

interface SnapshotIndexColumn {
  expression: string
}

interface SnapshotIndex {
  name: string
  columns: SnapshotIndexColumn[]
  isUnique: boolean
  where?: string
}

interface SnapshotTable {
  name: string
  uniqueConstraints?: Record<string, SnapshotUniqueConstraint>
  indexes?: Record<string, SnapshotIndex>
}

// Intentionally NOT applied: CHECK constraints.
//
// The server schema defines CHECK constraints on generators, organizations,
// invitations, and maintenance_templates (see server migrations). We do not
// mirror them into the client SQLite test DB because:
//   1. SQLite CHECKs must be declared at CREATE TABLE time; we'd have to
//      rebuild tables or emulate them with triggers.
//   2. Every server CHECK is already directly exercised by PGlite handler
//      integration tests in:
//      src/data/server/api/routers/powersync/__tests__/handlers-integration-test.ts
//   3. Client-side inputs are also validated by Zod schemas before ever
//      reaching a mutation (`src/data/client/validation/`).
//
// If you add a new server CHECK, add a PGlite handler test that exercises it
// rather than trying to mirror it here.
function applyServerConstraints(db: Database.Database) {
  const snapshot = generateDrizzleJson(serverSchema)
  const clientTableNames = new Set<string>(
    CLIENT_TABLES.map(t => getTableName(t))
  )

  for (const tableData of Object.values(snapshot.tables)) {
    const table = tableData as SnapshotTable
    if (!clientTableNames.has(table.name)) continue

    // unique() constraints
    for (const uc of Object.values(table.uniqueConstraints ?? {})) {
      const cols = uc.columns.map(c => `"${c}"`).join(', ')
      db.exec(`CREATE UNIQUE INDEX "${uc.name}" ON "${table.name}" (${cols})`)
    }

    // uniqueIndex() indexes (may have WHERE clause for partial indexes)
    for (const idx of Object.values(table.indexes ?? {})) {
      if (!idx.isUnique) continue
      const cols = idx.columns.map(c => `"${c.expression}"`).join(', ')
      const where = idx.where ? ` WHERE ${idx.where}` : ''
      db.exec(
        `CREATE UNIQUE INDEX "${idx.name}" ON "${table.name}" (${cols})${where}`
      )
    }
  }
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

  const currentSnapshot = await generateSQLiteDrizzleJson(clientSchema)
  const statements = await generateSQLiteMigration(
    emptySnapshot,
    currentSnapshot
  )

  for (const stmt of statements) db.exec(stmt)
}
