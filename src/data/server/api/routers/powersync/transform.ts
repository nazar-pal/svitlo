import { getTableColumns, is } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import * as serverSchema from '@/data/server/db-schema'

const TIMESTAMP_FIELDS = new Set<string>()
const BOOLEAN_FIELDS = new Set<string>()
const NUMBER_FIELDS = new Set<string>()

for (const value of Object.values(serverSchema)) {
  if (!is(value, PgTable)) continue
  for (const col of Object.values(getTableColumns(value))) {
    if (col.dataType === 'date') TIMESTAMP_FIELDS.add(col.name)
    else if (col.dataType === 'boolean') BOOLEAN_FIELDS.add(col.name)
    else if (col.dataType === 'number') NUMBER_FIELDS.add(col.name)
  }
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function convertValue(key: string, value: unknown): unknown {
  if (value == null) return null
  if (TIMESTAMP_FIELDS.has(key)) return new Date(value as string)
  if (BOOLEAN_FIELDS.has(key))
    return value === '1' || value === 1 || value === true
  if (NUMBER_FIELDS.has(key)) return Number(value)
  return value
}

/**
 * Convert PowerSync upload data (snake_case keys, string values)
 * into Drizzle-compatible format (camelCase keys, proper types).
 *
 * Strips `id` since it's always passed separately by the caller.
 *
 * Generic parameter lets callers specify the Drizzle insert/update type
 * so `.values()` and `.set()` calls typecheck without inline assertions.
 * Runtime correctness is guaranteed by the client Zod schemas + DB constraints.
 */
export function transformSyncData<T = Record<string, unknown>>(
  data: Record<string, unknown>
): T {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id') continue
    result[snakeToCamel(key)] = convertValue(key, value)
  }
  return result as T
}
