import { and, eq } from 'drizzle-orm'

import type { db as serverDb } from '@/data/server'
import { invitations, organizationMembers } from '@/data/server/db-schema'
import type { InvitationFactsProvider } from '@/data/shared/invitations'

type Db = typeof serverDb

// Server adapter: implements InvitationFactsProvider against Neon Postgres
// (or PGlite in tests) via Drizzle. Built as a factory because each request
// supplies its own `db` via WriteContext — no singleton.
export function createServerInvitationFactsProvider(
  db: Db
): InvitationFactsProvider {
  return {
    async findInvitationById(invitationId) {
      const row = await db.query.invitations.findFirst({
        where: eq(invitations.id, invitationId),
        columns: { organizationId: true, inviteeEmail: true }
      })
      if (!row) return null
      return {
        organizationId: row.organizationId,
        inviteeEmail: row.inviteeEmail
      }
    },

    async findInvitationByOrgAndEmail(organizationId, inviteeEmail) {
      const row = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.organizationId, organizationId),
          eq(invitations.inviteeEmail, inviteeEmail)
        ),
        columns: { organizationId: true, inviteeEmail: true }
      })
      if (!row) return null
      return {
        organizationId: row.organizationId,
        inviteeEmail: row.inviteeEmail
      }
    },

    async hasMembership(userId, organizationId) {
      const row = await db.query.organizationMembers.findFirst({
        where: and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        ),
        columns: { id: true }
      })
      return row !== undefined
    }
  }
}
