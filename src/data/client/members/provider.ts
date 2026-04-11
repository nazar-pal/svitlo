import {
  getOrganizationAdminUserId,
  getOrgMemberById,
  getOrgMembershipById
} from '@/data/client/queries'
import type { MemberFactsProvider } from '@/data/shared/members'
import type { ClientDb } from '@/lib/powersync/database'

// Client adapter: implements MemberFactsProvider against PowerSync SQLite
// via the existing query helpers.
export function createClientMemberFactsProvider(
  db: ClientDb
): MemberFactsProvider {
  return {
    async findMembershipById(memberId) {
      const row = await getOrgMembershipById(db, memberId)
      if (!row) return null
      return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId
      }
    },

    async findMembershipByUserAndOrg(userId, organizationId) {
      const row = await getOrgMemberById(db, userId, organizationId)
      if (!row) return null
      return {
        id: row.id,
        organizationId: row.organizationId,
        userId: row.userId
      }
    },

    async findOrgAdmin(organizationId) {
      const adminUserId = await getOrganizationAdminUserId(db, organizationId)
      if (!adminUserId) return null
      return { adminUserId }
    }
  }
}
