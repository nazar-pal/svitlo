import { getTableColumns, type InferInsertModel } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'

interface ColumnMeta {
  tsKey: string
  dataType: string
}

const columnMapCache = new WeakMap<PgTable, Map<string, ColumnMeta>>()

function getColumnMap(table: PgTable): Map<string, ColumnMeta> {
  const cached = columnMapCache.get(table)
  if (cached) return cached
  const map = new Map<string, ColumnMeta>()
  for (const [tsKey, col] of Object.entries(getTableColumns(table)))
    map.set(col.name, { tsKey, dataType: col.dataType })
  columnMapCache.set(table, map)
  return map
}

function convertValue(dataType: string, value: unknown): unknown {
  if (value == null) return null
  if (dataType === 'date') return new Date(value as string)
  if (dataType === 'boolean')
    return value === '1' || value === 1 || value === true
  if (dataType === 'number') return Number(value)
  return value
}

/**
 * Convert a PowerSync upload row (snake_case keys, string values) for a
 * specific table into a Drizzle-compatible partial insert object.
 *
 * Coercion is driven by each column's Drizzle `dataType` on *this* table, so
 * column-name collisions between tables cannot silently miscoerce. Snake →
 * camel mapping comes from `getTableColumns(table)` rather than a regex, and
 * keys that don't correspond to a column on this table are dropped (Zod
 * schemas upstream or Drizzle itself would strip them anyway).
 */
export function transformSyncRow<T extends PgTable>(
  table: T,
  data: Record<string, unknown>
): Partial<InferInsertModel<T>> {
  const columnMap = getColumnMap(table)
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id') continue
    const meta = columnMap.get(key)
    if (!meta) continue
    result[meta.tsKey] = convertValue(meta.dataType, value)
  }
  return result as Partial<InferInsertModel<T>>
}
