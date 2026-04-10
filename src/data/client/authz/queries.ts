import { eq, sql } from 'drizzle-orm'

import {
  generatorUserAssignments,
  generators,
  organizations
} from '@/data/client/db-schema'
import { db } from '@/lib/powersync/database'

// Single row: admin user id for an organization (or null if the org is
// missing). Dedicated fact-level helper so authz never needs to know which
// columns it's reading.
export async function getOrgAuthzFacts(
  orgId: string
): Promise<{ adminUserId: string | null } | null> {
  const [row] = await db
    .select({ adminUserId: organizations.adminUserId })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  return row ?? null
}

// Single round trip: joins generators → organizations and probes the
// assignment table with an EXISTS subquery, so every generator-level authz
// question costs one SQL statement. Mirrors the server's
// getGeneratorAuthzFacts in src/data/server/api/routers/powersync/handlers.ts.
//
// SQLite returns EXISTS as 0/1, so we coerce to a real boolean here to keep
// the external shape aligned with the server helper.
export async function getGeneratorAuthzFacts(
  userId: string,
  generatorId: string
): Promise<{
  orgAdminUserId: string | null
  hasAssignment: boolean
} | null> {
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
    .leftJoin(organizations, eq(generators.organizationId, organizations.id))
    .where(eq(generators.id, generatorId))
    .limit(1)

  if (!row) return null
  return {
    orgAdminUserId: row.orgAdminUserId,
    hasAssignment: row.hasAssignment === 1
  }
}
