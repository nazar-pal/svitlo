import {
  getInvitationById,
  getInvitationByOrgAndEmail,
  getOrgMemberById
} from '@/data/client/queries'
import type { InvitationFactsProvider } from '@/data/shared/invitations'

// Client adapter: implements InvitationFactsProvider against PowerSync
// SQLite via the existing query helpers.
export const clientInvitationFactsProvider: InvitationFactsProvider = {
  async findInvitationById(invitationId) {
    const row = await getInvitationById(invitationId)
    if (!row) return null
    return {
      organizationId: row.organizationId,
      inviteeEmail: row.inviteeEmail
    }
  },

  async findInvitationByOrgAndEmail(organizationId, inviteeEmail) {
    const row = await getInvitationByOrgAndEmail(organizationId, inviteeEmail)
    if (!row) return null
    return {
      organizationId: row.organizationId,
      inviteeEmail: row.inviteeEmail
    }
  },

  async hasMembership(userId, organizationId) {
    return (await getOrgMemberById(userId, organizationId)) !== null
  }
}
