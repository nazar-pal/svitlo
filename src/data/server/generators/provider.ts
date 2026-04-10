import { eq } from 'drizzle-orm'

import type { db as serverDb } from '@/data/server'
import { generators } from '@/data/server/db-schema'
import type { GeneratorFactsProvider } from '@/data/shared/generators'

type Db = typeof serverDb

// Server adapter: implements GeneratorFactsProvider against Neon Postgres (or
// PGlite in tests) via Drizzle. Built as a factory because each request
// supplies its own `db` via WriteContext — no singleton.
export function createServerGeneratorFactsProvider(
  db: Db
): GeneratorFactsProvider {
  return {
    async findGenerator(generatorId) {
      const row = await db.query.generators.findFirst({
        where: eq(generators.id, generatorId),
        columns: { organizationId: true }
      })
      if (!row) return null
      return { organizationId: row.organizationId }
    }
  }
}
