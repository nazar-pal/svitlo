import { eq } from 'drizzle-orm'

import type { db as serverDb } from '@/data/server'
import { organizations } from '@/data/server/db-schema'
import type { OrganizationFactsProvider } from '@/data/shared/organizations'

type Db = typeof serverDb

// Server adapter: implements OrganizationFactsProvider against Neon Postgres
// (or PGlite in tests) via Drizzle. Built as a factory because each request
// supplies its own `db` via WriteContext — no singleton.
export function createServerOrganizationFactsProvider(
  db: Db
): OrganizationFactsProvider {
  return {
    async findOrganization(id) {
      const row = await db.query.organizations.findFirst({
        where: eq(organizations.id, id),
        columns: { id: true, adminUserId: true }
      })
      if (!row) return null
      return { id: row.id, adminUserId: row.adminUserId }
    }
  }
}
