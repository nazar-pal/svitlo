import { getTableName, is } from 'drizzle-orm'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'
import { generateDrizzleJson } from 'drizzle-kit/api'

import * as clientSchema from '@/data/client/db-schema'
import * as serverSchema from '@/data/server/db-schema'

import type { SnapshotTable } from './drizzle-snapshot-types'

const clientTableNames = new Set<string>(
  Object.values(clientSchema)
    .filter(v => is(v, SQLiteTable))
    .map(t => getTableName(t as SQLiteTable))
)

describe('server constraint sync completeness', () => {
  it('all server unique constraints on client tables are tracked', () => {
    const snapshot = generateDrizzleJson(serverSchema)

    const applied: string[] = []
    const skipped: string[] = []

    for (const tableData of Object.values(snapshot.tables)) {
      const table = tableData as SnapshotTable

      for (const uc of Object.values(table.uniqueConstraints ?? {})) {
        if (clientTableNames.has(table.name)) applied.push(uc.name)
        else skipped.push(`${table.name}: ${uc.name}`)
      }

      for (const idx of Object.values(table.indexes ?? {})) {
        if (!idx.isUnique) continue
        if (clientTableNames.has(table.name)) applied.push(idx.name)
        else skipped.push(`${table.name}: ${idx.name}`)
      }
    }

    // Constraints applied to client tables (update when adding new server constraints on client tables)
    expect(applied.sort()).toEqual([
      'generator_sessions_one_active_per_generator',
      'generator_user_assignments_generator_user_unique',
      'invitations_org_email_unique',
      'organization_members_org_user_unique',
      'user_email_unique'
    ])

    // Constraints on server-only tables that are correctly skipped
    expect(skipped.sort()).toEqual(['session: session_token_unique'])
  })
})
