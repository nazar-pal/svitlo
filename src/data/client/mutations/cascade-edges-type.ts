import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core'

export interface CascadeEdge {
  parent: SQLiteTable
  child: SQLiteTable
  parentKey: SQLiteColumn
  childFk: SQLiteColumn
}
