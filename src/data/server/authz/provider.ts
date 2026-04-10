import { eq, sql } from 'drizzle-orm'

import type { db as serverDb } from '@/data/server'
import {
  generatorUserAssignments,
  generators,
  organizations
} from '@/data/server/db-schema'
import type {
  AuthzFactsProvider,
  GeneratorAuthzFacts,
  OrgAuthzFacts
} from '@/data/shared/authz'

type Db = typeof serverDb

// Server adapter: implements AuthzFactsProvider against Neon Postgres (or
// PGlite in tests) via Drizzle. Built as a factory because each request
// supplies its own `db` via WriteContext — no singleton.
export function createServerAuthzProvider(db: Db): AuthzFactsProvider {
  return {
    async getOrgFacts(orgId): Promise<OrgAuthzFacts | null> {
      const row = await db.query.organizations.findFirst({
        where: eq(organizations.id, orgId),
        columns: { adminUserId: true }
      })
      return row ? { adminUserId: row.adminUserId } : null
    },

    async getGeneratorFacts(
      userId,
      generatorId
    ): Promise<GeneratorAuthzFacts | null> {
      const [row] = await db
        .select({
          orgAdminUserId: organizations.adminUserId,
          hasAssignment: sql<boolean>`
            EXISTS (
              SELECT 1 FROM ${generatorUserAssignments}
              WHERE ${generatorUserAssignments.generatorId} = ${generators.id}
                AND ${generatorUserAssignments.userId} = ${userId}
            )
          `
        })
        .from(generators)
        .leftJoin(
          organizations,
          eq(generators.organizationId, organizations.id)
        )
        .where(eq(generators.id, generatorId))
        .limit(1)

      if (!row) return null
      return {
        orgAdminUserId: row.orgAdminUserId,
        // PG returns a real boolean; coerce defensively to match the port
        // contract and stay aligned with the client adapter's belt-and-braces
        // handling of the same column.
        hasAssignment: row.hasAssignment === true
      }
    }
  }
}
