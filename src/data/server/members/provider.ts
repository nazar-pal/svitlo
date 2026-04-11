import { and, eq } from 'drizzle-orm'

import type { db as serverDb } from '@/data/server'
import { organizationMembers, organizations } from '@/data/server/db-schema'
import type { MemberFactsProvider } from '@/data/shared/members'

type Db = typeof serverDb

// Server adapter: implements MemberFactsProvider against Neon Postgres (or
// PGlite in tests) via Drizzle. Built as a factory because each request
// supplies its own `db` via WriteContext — no singleton.
export function createServerMemberFactsProvider(db: Db): MemberFactsProvider {
  return {
    async findMembershipById(memberId) {
      const row = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.id, memberId),
        columns: { id: true, organizationId: true, userId: true }
      })
      if (!row) return null
      return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId
      }
    },

    async findMembershipByUserAndOrg(userId, organizationId) {
      const row = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        ),
        columns: { id: true, organizationId: true, userId: true }
      })
      if (!row) return null
      return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId
      }
    },

    async findOrgAdmin(organizationId) {
      const row = await db.query.organizations.findFirst({
        where: eq(organizations.id, organizationId),
        columns: { adminUserId: true }
      })
      if (!row) return null
      return { adminUserId: row.adminUserId }
    }
  }
}
