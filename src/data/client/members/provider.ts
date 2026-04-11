import {
  getOrganizationAdminUserId,
  getOrgMemberById,
  getOrgMembershipById
} from '@/data/client/queries'
import type { MemberFactsProvider } from '@/data/shared/members'

// Client adapter: implements MemberFactsProvider against PowerSync SQLite
// via the existing query helpers.
export const clientMemberFactsProvider: MemberFactsProvider = {
  async findMembershipById(memberId) {
    const row = await getOrgMembershipById(memberId)
    if (!row) return null
    return {
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId
    }
  },

  async findMembershipByUserAndOrg(userId, organizationId) {
    const row = await getOrgMemberById(userId, organizationId)
    if (!row) return null
    return {
      id: row.id,
      organizationId: row.organizationId,
      userId: row.userId
    }
  },

  async findOrgAdmin(organizationId) {
    const adminUserId = await getOrganizationAdminUserId(organizationId)
    if (!adminUserId) return null
    return { adminUserId }
  }
}
