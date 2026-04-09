import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Triggers that cannot be expressed in Drizzle schema.
// Used by test-server-db.ts to apply production-parity triggers to PGlite.
//
// Source of truth is the SQL migration files in ../migrations/. Never
// hand-edit trigger SQL here — edit (or add) the migration file. Any file
// matching `*_custom_*trigger*.sql` in that directory is picked up
// automatically, so a second custom trigger cannot silently skip PGlite
// tests. The drift guard in triggers-test.ts pins this invariant.
//
// This file is only imported by test-server-db.ts (Node test env), so
// `fs` + `__dirname` are safe.

const MIGRATIONS_DIR = join(__dirname, '../migrations')
const CUSTOM_TRIGGER_PATTERN = /_custom_.*trigger.*\.sql$/

function loadCustomTriggerSql(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(name => CUSTOM_TRIGGER_PATTERN.test(name))
    .sort()

  return files
    .map(name => readFileSync(join(MIGRATIONS_DIR, name), 'utf8'))
    .join('\n\n')
}

export const CUSTOM_TRIGGERS = loadCustomTriggerSql()
