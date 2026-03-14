// Fields that arrive as ISO strings from SQLite and need Date conversion
const TIMESTAMP_FIELDS = new Set([
  'created_at',
  'joined_at',
  'assigned_at',
  'started_at',
  'stopped_at',
  'performed_at',
  'updated_at'
])

// Fields that arrive as 0/1 from SQLite and need boolean conversion
const BOOLEAN_FIELDS = new Set(['is_one_time'])

// Fields that may arrive as strings from SQLite and need Number conversion
const NUMBER_FIELDS = new Set([
  'max_consecutive_run_hours',
  'required_rest_hours',
  'run_warning_threshold_pct',
  'trigger_hours_interval',
  'trigger_calendar_days'
])

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
