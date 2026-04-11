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
import { db as productionDb, type ClientDb } from '@/lib/powersync/database'

// Client adapter: implements AuthzFactsProvider against PowerSync SQLite via
// Drizzle. The EXISTS subquery returns 0/1 on SQLite, so we coerce to a real
// boolean at this boundary — the shared check layer only speaks booleans.
export function createClientAuthzProvider(db: ClientDb): AuthzFactsProvider {
  return {
    async getOrgFacts(orgId): Promise<OrgAuthzFacts | null> {
      const [row] = await db
        .select({ adminUserId: organizations.adminUserId })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1)
      return row ?? null
    },

    async getGeneratorFacts(
      userId,
      generatorId
    ): Promise<GeneratorAuthzFacts | null> {
      const [row] = await db
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
        .leftJoin(
          organizations,
          eq(generators.organizationId, organizations.id)
        )
        .where(eq(generators.id, generatorId))
        .limit(1)

      if (!row) return null
      return {
        orgAdminUserId: row.orgAdminUserId,
        hasAssignment: row.hasAssignment === 1
      }
    }
  }
}

// Singleton wrapper used by the rest of the client layer today. Accesses
// `productionDb` lazily inside each method so that jest.mock consumers (which
// replace `@/lib/powersync/database` with a getter) don't blow up at module
// load before their mock backing is initialised. Will be removed once the
// remaining `<xxx>/index.ts` bundles switch to the factory in a later commit.
export const clientAuthzProvider: AuthzFactsProvider = {
  getOrgFacts: orgId => createClientAuthzProvider(productionDb).getOrgFacts(orgId),
  getGeneratorFacts: (userId, generatorId) =>
    createClientAuthzProvider(productionDb).getGeneratorFacts(
      userId,
      generatorId
    )
}
