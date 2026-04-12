import { getTableName, is } from 'drizzle-orm'
import { SQLiteTable } from 'drizzle-orm/sqlite-core'
import { generateDrizzleJson } from 'drizzle-kit/api'

import * as clientSchema from '@/data/client/db-schema'
import * as serverSchema from '@/data/server/db-schema'

import { CASCADE_EDGES } from '../cascade'

interface SnapshotForeignKey {
  tableFrom: string
  tableTo: string
  columnsFrom: string[]
  columnsTo: string[]
  onDelete: string
}

interface SnapshotTable {
  name: string
  foreignKeys?: Record<string, SnapshotForeignKey>
}

const clientTableNames = new Set<string>(
  Object.values(clientSchema)
    .filter(v => is(v, SQLiteTable))
    .map(t => getTableName(t as SQLiteTable))
)

function toCanonical(
  child: string,
  childCol: string,
  parent: string,
  parentCol: string
) {
  return `${child}.${childCol} -> ${parent}.${parentCol}`
}

describe('cascade edge conformance', () => {
  it('CASCADE_EDGES matches every onDelete cascade FK between client tables', () => {
    const snapshot = generateDrizzleJson(serverSchema)

    const serverEdges: string[] = []
    for (const tableData of Object.values(snapshot.tables)) {
      const table = tableData as SnapshotTable
      for (const fk of Object.values(table.foreignKeys ?? {})) {
        if (fk.onDelete !== 'cascade') continue
        if (!clientTableNames.has(fk.tableFrom)) continue
        if (!clientTableNames.has(fk.tableTo)) continue
        serverEdges.push(
          toCanonical(
            fk.tableFrom,
            fk.columnsFrom[0],
            fk.tableTo,
            fk.columnsTo[0]
          )
        )
      }
    }

    const clientEdges = CASCADE_EDGES.map(e =>
      toCanonical(
        getTableName(e.child),
        e.childFk.name,
        getTableName(e.parent),
        e.parentKey.name
      )
    )

    expect(clientEdges.sort()).toEqual(serverEdges.sort())
  })
})
