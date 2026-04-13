import type { AuthzChecks } from '@/data/shared/authz'
import type { ParamFreeMutationErrorCode } from '@/data/shared/errors'
import { policyOk as ok, type PolicyResult } from '@/data/shared/policy-result'

export type { PolicyResult }

// --- Facts port ---

// Fact shapes the invitation-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

export interface InvitationRef {
  organizationId: string
  inviteeEmail: string
}

// Port: adapters answer "is this invitation row present" and "does this
// user already belong to this org". Both client (SQLite) and server
// (Postgres) implement it against their own dialect.
export interface InvitationFactsProvider {
  findInvitationById(invitationId: string): Promise<InvitationRef | null>
  findInvitationByOrgAndEmail(
    organizationId: string,
    inviteeEmail: string
  ): Promise<InvitationRef | null>
  hasMembership(userId: string, organizationId: string): Promise<boolean>
}

// --- Pure policy rules ---

// Pure invitation-lifecycle rules. No I/O. Callers fetch facts, then ask
// the policy. Both client (PowerSync SQLite) and server (Postgres) reuse
// these so the rules live in exactly one place. Email comparison is
// case-insensitive — same rule both sides (the server already normalizes
// via `LOWER()` in SQL, the client via `.toLowerCase()` in JS).

// Local `fail` helper so the return type narrows to just the failure
// variant — `policyFail` returns the wider `PolicyResult` which breaks
// inference for the richer success shape of `AcceptInvitationResult`.
const fail = (
  code: ParamFreeMutationErrorCode
): { ok: false; code: ParamFreeMutationErrorCode } => ({ ok: false, code })

// `acceptInvitationPolicy` surfaces the fetched invitation on success so the
// caller can drive the "create membership + delete invitation" side effect
// without a second round trip.
export type AcceptInvitationResult =
  | { ok: true; invitation: InvitationRef }
  | Exclude<PolicyResult, { ok: true }>

export const createInvitationPolicy = (facts: {
  isOrgAdmin: boolean
  alreadyInvited: boolean
}): PolicyResult => {
  if (!facts.isOrgAdmin) return fail('ONLY_ADMIN_CAN_INVITE')
  if (facts.alreadyInvited) return fail('INVITATION_ALREADY_SENT')
  return ok
}

export const acceptInvitationPolicy = (facts: {
  invitation: InvitationRef | null
  userEmail: string
  alreadyMember: boolean
}): AcceptInvitationResult => {
  if (!facts.invitation) return fail('INVITATION_NOT_FOUND')
  if (
    facts.invitation.inviteeEmail.toLowerCase() !==
    facts.userEmail.toLowerCase()
  )
    return fail('INVITATION_NOT_FOR_YOU')
  if (facts.alreadyMember) return fail('ALREADY_MEMBER')
  return { ok: true, invitation: facts.invitation }
}

export const declineInvitationPolicy = (facts: {
  invitation: InvitationRef | null
  userEmail: string
}): PolicyResult => {
  if (!facts.invitation) return fail('INVITATION_NOT_FOUND')
  if (
    facts.invitation.inviteeEmail.toLowerCase() !==
    facts.userEmail.toLowerCase()
  )
    return fail('INVITATION_NOT_FOR_YOU')
  return ok
}

export const cancelInvitationPolicy = (facts: {
  invitation: InvitationRef | null
  isCallerOrgAdmin: boolean
}): PolicyResult => {
  if (!facts.invitation) return fail('INVITATION_NOT_FOUND')
  if (!facts.isCallerOrgAdmin) return fail('ONLY_ADMIN_CAN_CANCEL_INVITATIONS')
  return ok
}

// --- Lifecycle orchestrator — wires facts + authz → policy ---

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
      return createInvitationPolicy({
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
      return acceptInvitationPolicy({
        invitation,
        userEmail,
        alreadyMember
      })
    },

    async declineInvitation(userEmail, invitationId) {
      const invitation = await facts.findInvitationById(invitationId)
      return declineInvitationPolicy({ invitation, userEmail })
    },

    async cancelInvitation(callerUserId, invitationId) {
      const invitation = await facts.findInvitationById(invitationId)
      const isCallerOrgAdmin = invitation
        ? await authz.isOrgAdmin(callerUserId, invitation.organizationId)
        : false
      return cancelInvitationPolicy({ invitation, isCallerOrgAdmin })
    }
  }
}
