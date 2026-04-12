import { eq, sql } from 'drizzle-orm'

import {
  generatorUserAssignments,
  generators,
  organizations
} from '@/data/client/db-schema'
import type {
  AuthzFactsProvider,
  GeneratorAuthzFacts,
  OrgAuthzFacts
} from '@/data/shared/authz'
import type { ClientDb } from '@/lib/powersync/database'

// Single source of truth for the generator-authz facts SQL. Both the async
// provider (mutation path) and the reactive hook (UI path) call this — the
// EXISTS subquery returns 0/1 on SQLite, so the `hasAssignment === 1` coercion
// lives at the call sites that need booleans.
export function getGeneratorAuthzFactsQuery(
  db: ClientDb,
  userId: string,
  generatorId: string
) {
  return db
    .select({
      orgAdminUserId: organizations.adminUserId,
      hasAssignment: sql<number>`
        EXISTS (
          SELECT 1 FROM ${generatorUserAssignments}
          WHERE ${generatorUserAssignments.generatorId} = ${generators.id}
            AND ${generatorUserAssignments.userId} = ${userId}
        )
      `
    })
    .from(generators)
    .leftJoin(organizations, eq(generators.organizationId, organizations.id))
    .where(eq(generators.id, generatorId))
    .limit(1)
}

// Single source of truth for the org-authz facts SQL. Both the async provider
// (mutation path via `getOrgFacts`) and the reactive hook (UI path via
// `useOrgAuthzFacts`) call this. Projects exactly the `OrgAuthzFacts` shape so
// `getOrgFacts` can return the row directly.
export function getOrgAuthzFactsQuery(db: ClientDb, organizationId: string) {
  return db
    .select({ adminUserId: organizations.adminUserId })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)
}

// Client adapter: implements AuthzFactsProvider against PowerSync SQLite via
// Drizzle. The EXISTS subquery returns 0/1 on SQLite, so we coerce to a real
// boolean at this boundary — the shared check layer only speaks booleans.
export function createClientAuthzProvider(db: ClientDb): AuthzFactsProvider {
  return {
    async getOrgFacts(orgId): Promise<OrgAuthzFacts | null> {
      const [row] = await getOrgAuthzFactsQuery(db, orgId)
      return row ?? null
    },

    async getGeneratorFacts(
      userId,
      generatorId
    ): Promise<GeneratorAuthzFacts | null> {
      const [row] = await getGeneratorAuthzFactsQuery(db, userId, generatorId)
      if (!row) return null
      return {
        orgAdminUserId: row.orgAdminUserId,
        hasAssignment: row.hasAssignment === 1
      }
    }
  }
}
