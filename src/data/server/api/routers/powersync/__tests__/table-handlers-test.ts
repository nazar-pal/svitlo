import { getTableName, is } from 'drizzle-orm'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'

import * as clientSchema from '@/data/client/db-schema'

import { tableHandlers } from '../handlers'

const syncedClientTables = Object.values(clientSchema)
  .filter(v => is(v, SQLiteTable))
  .map(getTableName)

describe('tableHandlers dispatch', () => {
  it('has an entry for every synced client table', () => {
    expect(Object.keys(tableHandlers).sort()).toEqual(
      [...syncedClientTables].sort()
    )
  })

  it('every entry is a function', () => {
    for (const handler of Object.values(tableHandlers))
      expect(typeof handler).toBe('function')
  })
})
