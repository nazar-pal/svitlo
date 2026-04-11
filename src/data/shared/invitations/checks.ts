import type { AuthzChecks } from '@/data/shared/authz'

import type { InvitationFactsProvider } from './facts'
import * as policy from './policy'
import type { AcceptInvitationResult, PolicyResult } from './policy'

export interface InvitationLifecycleChecks {
  createInvitation(
    callerUserId: string,
    organizationId: string,
    inviteeEmail: string
  ): Promise<PolicyResult>
  acceptInvitation(
    userId: string,
    userEmail: string,
    invitationId: string
  ): Promise<AcceptInvitationResult>
  declineInvitation(
    userEmail: string,
    invitationId: string
  ): Promise<PolicyResult>
  cancelInvitation(
    callerUserId: string,
    invitationId: string
  ): Promise<PolicyResult>
}

// Single source of truth for invitation-lifecycle decisions. Both client
// (PowerSync SQLite) and server (Postgres) adapters funnel through here —
// each side only customises how facts get fetched and how authz is built.
export function createInvitationLifecycleChecks(
  facts: InvitationFactsProvider,
  authz: AuthzChecks
): InvitationLifecycleChecks {
  return {
    async createInvitation(callerUserId, organizationId, inviteeEmail) {
      const [isOrgAdmin, existing] = await Promise.all([
        authz.isOrgAdmin(callerUserId, organizationId),
        facts.findInvitationByOrgAndEmail(organizationId, inviteeEmail)
      ])
      return policy.createInvitationPolicy({
        isOrgAdmin,
        alreadyInvited: existing !== null
      })
    },

    async acceptInvitation(userId, userEmail, invitationId) {
      const invitation = await facts.findInvitationById(invitationId)
      // Skip the membership lookup entirely when the invitation is gone —
      // the policy short-circuits on `!invitation` anyway and there's no
      // organizationId to query against.
      const alreadyMember = invitation
        ? await facts.hasMembership(userId, invitation.organizationId)
        : false
      return policy.acceptInvitationPolicy({
        invitation,
        userEmail,
        alreadyMember
      })
    },

    async declineInvitation(userEmail, invitationId) {
      const invitation = await facts.findInvitationById(invitationId)
      return policy.declineInvitationPolicy({ invitation, userEmail })
    },

    async cancelInvitation(callerUserId, invitationId) {
      const invitation = await facts.findInvitationById(invitationId)
      const isCallerOrgAdmin = invitation
        ? await authz.isOrgAdmin(callerUserId, invitation.organizationId)
        : false
      return policy.cancelInvitationPolicy({ invitation, isCallerOrgAdmin })
    }
  }
}
