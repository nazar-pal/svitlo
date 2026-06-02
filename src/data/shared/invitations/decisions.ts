import * as authzPolicy from '@/data/shared/authz/policy'
import { defineDecision, factPlanFor } from '@/data/shared/facts/decisions'

import {
  acceptInvitationPolicy,
  cancelInvitationPolicy,
  createInvitationPolicy,
  declineInvitationPolicy,
  type AcceptInvitationResult,
  type InvitationRef,
  type PolicyResult
} from './index'

type OrgAuthzFact = { adminUserId: string | null } | null

// ── createInvitation ────────────────────────────────────────────────────────

export interface CreateInvitationArgs {
  callerUserId: string
  organizationId: string
  inviteeEmail: string
}

interface CreateInvitationFacts {
  authzOrg: OrgAuthzFact
  existing?: InvitationRef | null
}

const createInvitationPlan = factPlanFor<
  CreateInvitationArgs,
  CreateInvitationFacts
>()

export const createInvitation = defineDecision<
  CreateInvitationArgs,
  CreateInvitationFacts,
  PolicyResult
>({
  id: 'invitations.createInvitation',
  plan: [
    createInvitationPlan('authzOrg', 'authz.org', a => a.organizationId),
    // Members-screen affordance gate passes `inviteeEmail: ''` before the
    // user has typed one; skip the lookup in that case so we don't spend a
    // query on an email that will never match. The rule reads
    // `alreadyInvited` as truthy on the `existing` fact so the skip
    // (undefined) and a real miss (null) both land on `false`.
    createInvitationPlan('existing', 'invitation.byOrgAndEmail', a => {
      const normalized = a.inviteeEmail.trim().toLowerCase()
      if (normalized === '') return null
      return { organizationId: a.organizationId, inviteeEmail: normalized }
    })
  ],
  rule: (args, facts) =>
    createInvitationPolicy({
      isOrgAdmin: authzPolicy.isOrgAdmin(
        args.callerUserId,
        facts.authzOrg?.adminUserId ?? null
      ),
      alreadyInvited: !!facts.existing
    })
})

// ── acceptInvitation ────────────────────────────────────────────────────────

export interface AcceptInvitationArgs {
  userId: string
  userEmail: string
  invitationId: string
}

interface AcceptInvitationFacts {
  invitation: InvitationRef | null
  alreadyMember?: boolean
}

const acceptInvitationPlan = factPlanFor<
  AcceptInvitationArgs,
  AcceptInvitationFacts
>()

export const acceptInvitation = defineDecision<
  AcceptInvitationArgs,
  AcceptInvitationFacts,
  AcceptInvitationResult
>({
  id: 'invitations.acceptInvitation',
  plan: [
    acceptInvitationPlan('invitation', 'invitation.byId', a => a.invitationId),
    acceptInvitationPlan(
      'alreadyMember',
      'orgMembership.hasForUserAndOrg',
      // Skip the membership lookup when the invitation is gone — the policy
      // short-circuits on `!invitation` anyway and there is no orgId to
      // query against.
      (a, f) =>
        f.invitation
          ? { userId: a.userId, organizationId: f.invitation.organizationId }
          : null
    )
  ],
  rule: (args, facts) =>
    acceptInvitationPolicy({
      invitation: facts.invitation,
      userEmail: args.userEmail,
      alreadyMember: facts.alreadyMember ?? false
    })
})

// ── declineInvitation ───────────────────────────────────────────────────────

export interface DeclineInvitationArgs {
  userEmail: string
  invitationId: string
}

interface DeclineInvitationFacts {
  invitation: InvitationRef | null
}

const declineInvitationPlan = factPlanFor<
  DeclineInvitationArgs,
  DeclineInvitationFacts
>()

export const declineInvitation = defineDecision<
  DeclineInvitationArgs,
  DeclineInvitationFacts,
  PolicyResult
>({
  id: 'invitations.declineInvitation',
  plan: [
    declineInvitationPlan('invitation', 'invitation.byId', a => a.invitationId)
  ],
  rule: (args, facts) =>
    declineInvitationPolicy({
      invitation: facts.invitation,
      userEmail: args.userEmail
    })
})

// ── cancelInvitation ────────────────────────────────────────────────────────

export interface CancelInvitationArgs {
  callerUserId: string
  invitationId: string
}

interface CancelInvitationFacts {
  invitation: InvitationRef | null
  authzOrg?: OrgAuthzFact
}

const cancelInvitationPlan = factPlanFor<
  CancelInvitationArgs,
  CancelInvitationFacts
>()

export const cancelInvitation = defineDecision<
  CancelInvitationArgs,
  CancelInvitationFacts,
  PolicyResult
>({
  id: 'invitations.cancelInvitation',
  plan: [
    cancelInvitationPlan('invitation', 'invitation.byId', a => a.invitationId),
    cancelInvitationPlan(
      'authzOrg',
      'authz.org',
      (_a, f) => f.invitation?.organizationId ?? null
    )
  ],
  rule: (args, facts) =>
    cancelInvitationPolicy({
      invitation: facts.invitation,
      isCallerOrgAdmin: authzPolicy.isOrgAdmin(
        args.callerUserId,
        facts.authzOrg?.adminUserId ?? null
      )
    })
})
