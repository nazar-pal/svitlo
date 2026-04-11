import { and, eq } from 'drizzle-orm'

import type { db as serverDb } from '@/data/server'
import {
  generatorUserAssignments,
  generators,
  organizationMembers
} from '@/data/server/db-schema'
import type { AssignmentFactsProvider } from '@/data/shared/assignments'

type Db = typeof serverDb

// Server adapter: implements AssignmentFactsProvider against Neon Postgres
// (or PGlite in tests) via Drizzle. Built as a factory because each request
// supplies its own `db` via WriteContext — no singleton.
export function createServerAssignmentFactsProvider(
  db: Db
): AssignmentFactsProvider {
  return {
    async findGeneratorOrgId(generatorId) {
      const row = await db.query.generators.findFirst({
        where: eq(generators.id, generatorId),
        columns: { organizationId: true }
      })
      return row?.organizationId ?? null
    },

    async isOrgMember(userId, organizationId) {
      const row = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        ),
        columns: { id: true }
      })
      return row !== undefined
    },

    async hasAssignment(userId, generatorId) {
      const row = await db.query.generatorUserAssignments.findFirst({
        where: and(
          eq(generatorUserAssignments.generatorId, generatorId),
          eq(generatorUserAssignments.userId, userId)
        ),
        columns: { id: true }
      })
      return row !== undefined
    }
  }
}
