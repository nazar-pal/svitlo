import {
  getInvitationById,
  getInvitationByOrgAndEmail,
  getOrgMemberById
} from '@/data/client/queries'
import type { InvitationFactsProvider } from '@/data/shared/invitations'
import { db as productionDb, type ClientDb } from '@/lib/powersync/database'

// Client adapter: implements InvitationFactsProvider against PowerSync
// SQLite via the existing query helpers.
export function createClientInvitationFactsProvider(
  db: ClientDb
): InvitationFactsProvider {
  return {
    async findInvitationById(invitationId) {
      const row = await getInvitationById(db, invitationId)
      if (!row) return null
      return {
        organizationId: row.organizationId,
        inviteeEmail: row.inviteeEmail
      }
    },

    async findInvitationByOrgAndEmail(organizationId, inviteeEmail) {
      const row = await getInvitationByOrgAndEmail(
        db,
        organizationId,
        inviteeEmail
      )
      if (!row) return null
      return {
        organizationId: row.organizationId,
        inviteeEmail: row.inviteeEmail
      }
    },

    async hasMembership(userId, organizationId) {
      return (await getOrgMemberById(db, userId, organizationId)) !== null
    }
  }
}

// Singleton wrapper: see note in organizations/provider.ts.
export const clientInvitationFactsProvider: InvitationFactsProvider = {
  findInvitationById: invitationId =>
    createClientInvitationFactsProvider(productionDb).findInvitationById(
      invitationId
    ),
  findInvitationByOrgAndEmail: (organizationId, inviteeEmail) =>
    createClientInvitationFactsProvider(productionDb).findInvitationByOrgAndEmail(
      organizationId,
      inviteeEmail
    ),
  hasMembership: (userId, organizationId) =>
    createClientInvitationFactsProvider(productionDb).hasMembership(
      userId,
      organizationId
    )
}
