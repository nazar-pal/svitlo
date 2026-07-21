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
import type { ClientDb } from '@/lib/powersync/database'

import type { WriteTx } from '../tx'

import type { SnapshotTable } from './drizzle-snapshot-types'

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
    writeTx: createTestWriteTx(sqlite, db)
  }
}

export function resetDatabase(sqlite: Database.Database) {
  for (const table of CLIENT_TABLES)
    sqlite.exec(`DELETE FROM "${getTableName(table)}"`)
}

export function closeDatabase(sqlite: Database.Database) {
  sqlite.close()
}

// ── WriteTx stand-in over better-sqlite3 ────────────────────────────────────
// better-sqlite3's own `db.transaction()` rejects async callbacks, so the
// production `db.transaction(async tx => ...)` path is unusable here. Instead
// we drive BEGIN/COMMIT/ROLLBACK manually on the underlying sqlite handle and
// pass the same Drizzle handle through as `tx` — every query issued on it
// between BEGIN and COMMIT participates in the transaction.
function createTestWriteTx(
  sqlite: Database.Database,
  db: ReturnType<typeof drizzle<typeof clientSchema>>
): WriteTx {
  return async fn => {
    sqlite.exec('BEGIN')
    try {
      const result = await fn(db as unknown as ClientDb)
      sqlite.exec('COMMIT')
      return result
    } catch (e) {
      sqlite.exec('ROLLBACK')
      throw e
    }
  }
}

// ── Server-parity constraints ───────────────────────────────────────────────
// Derived automatically from the server Drizzle schema via drizzle-kit snapshot.
// When you add/modify/remove a unique constraint or index in the server schema,
// it propagates here with zero manual sync.
//
// Snapshot shapes live in `./drizzle-snapshot-types` — drizzle-kit does not
// export these types, so they're hand-declared once and shared.

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
