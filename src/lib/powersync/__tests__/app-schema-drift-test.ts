import { is } from 'drizzle-orm'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'

import * as clientSchema from '@/data/client/db-schema'

import { tables } from '../tables'

const schemaEntries = Object.entries(
  clientSchema as Record<string, unknown>
).filter(([, value]) => is(value, SQLiteTable))

describe('PowerSync AppSchema drift guard', () => {
  const schemaTableNames = schemaEntries.map(([name]) => name).sort()
  const appSchemaTableNames = Object.keys(tables).sort()

  it('every client db-schema table is registered in PowerSync tables', () => {
    const missing = schemaTableNames.filter(
      name => !appSchemaTableNames.includes(name)
    )
    expect(missing).toEqual([])
  })

  it('every PowerSync tables entry exists in client db-schema', () => {
    const extra = appSchemaTableNames.filter(
      name => !schemaTableNames.includes(name)
    )
    expect(extra).toEqual([])
  })

  it('PowerSync tables values are the same Drizzle objects as db-schema exports', () => {
    const schemaByName = Object.fromEntries(schemaEntries)
    for (const name of appSchemaTableNames) {
      expect(tables[name as keyof typeof tables]).toBe(schemaByName[name])
    }
  })
})
