import type { AuthzChecks } from '@/data/shared/authz'

import type { MemberFactsProvider } from './facts'
import * as policy from './policy'
import type { LeaveOrganizationResult, RemoveMemberResult } from './policy'

export interface MemberLifecycleChecks {
  removeMember(
    callerUserId: string,
    memberId: string
  ): Promise<RemoveMemberResult>
  leaveOrganization(
    userId: string,
    organizationId: string
  ): Promise<LeaveOrganizationResult>
}

// Single source of truth for member-lifecycle decisions. Both client
// (PowerSync SQLite) and server (Postgres) adapters funnel through here —
// each side only customises how facts get fetched and how authz is built.
export function createMemberLifecycleChecks(
  facts: MemberFactsProvider,
  authz: AuthzChecks
): MemberLifecycleChecks {
  return {
    async removeMember(callerUserId, memberId) {
      const member = await facts.findMembershipById(memberId)
      // Short-circuit the authz + admin lookups when the row is missing.
      // Saves two round trips on the lost-ack replay path (server sees
      // delete for a row already gone).
      if (!member) return { ok: false, code: 'MEMBER_NOT_FOUND' }
      const [isCallerOrgAdmin, adminRef] = await Promise.all([
        authz.isOrgAdmin(callerUserId, member.organizationId),
        facts.findOrgAdmin(member.organizationId)
      ])
      return policy.removeMemberPolicy({
        member,
        isCallerOrgAdmin,
        adminUserId: adminRef?.adminUserId ?? null
      })
    },

    async leaveOrganization(userId, organizationId) {
      const [isCallerOrgAdmin, member, adminRef] = await Promise.all([
        authz.isOrgAdmin(userId, organizationId),
        facts.findMembershipByUserAndOrg(userId, organizationId),
        facts.findOrgAdmin(organizationId)
      ])
      return policy.leaveOrganizationPolicy({
        member,
        isCallerOrgAdmin,
        adminUserId: adminRef?.adminUserId ?? null
      })
    }
  }
}
