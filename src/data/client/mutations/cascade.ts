import { eq, getTableName, inArray, type SQL } from 'drizzle-orm'
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'

import type { ClientDb } from '@/lib/powersync/database'

import { CASCADE_EDGES } from './cascade-edges.generated'

export async function cascadeDelete(
  tx: ClientDb,
  root: SQLiteTable,
  rootKey: SQLiteColumn,
  id: string
): Promise<void> {
  const ops: { table: SQLiteTable; predicate: SQL }[] = []
  const visited = new Set<string>()

  function walk(table: SQLiteTable, predicate: SQL) {
    const name = getTableName(table)
    if (visited.has(name)) return
    visited.add(name)

    for (const edge of CASCADE_EDGES) {
      if (edge.parent !== table) continue
      if (visited.has(getTableName(edge.child))) continue

      const childPredicate =
        table === root
          ? eq(edge.childFk, id)
          : inArray(
              edge.childFk,
              tx
                .select({ v: edge.parentKey })
                .from(edge.parent)
                .where(predicate)
            )

      walk(edge.child, childPredicate)
    }

    ops.push({ table, predicate })
  }

  walk(root, eq(rootKey, id))

  for (const op of ops) await tx.delete(op.table).where(op.predicate)
}
