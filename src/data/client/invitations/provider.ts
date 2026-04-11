import {
  getInvitationById,
  getInvitationByOrgAndEmail,
  getOrgMemberById
} from '@/data/client/queries'
import type { InvitationFactsProvider } from '@/data/shared/invitations'
import { db } from '@/lib/powersync/database'

// Client adapter: implements InvitationFactsProvider against PowerSync
// SQLite via the existing query helpers.
export const clientInvitationFactsProvider: InvitationFactsProvider = {
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
