import type { ParamFreeMutationErrorCode } from '@/data/shared/errors'
import { policyOk as ok, type PolicyResult } from '@/data/shared/policy-result'

export type { PolicyResult }

// Fact shape the invitation-lifecycle policy needs. Adapters fetch raw
// rows and normalize into this schema-agnostic shape. Decisions in
// `./decisions.ts` wire the facts + authz providers to the rules below.
export interface InvitationRef {
  organizationId: string
  inviteeEmail: string
}

// Local `fail` helper so the return type narrows to just the failure
// variant — `policyFail` returns the wider `PolicyResult` which breaks
// inference for the richer success shape of `AcceptInvitationResult`.
const fail = (
  code: ParamFreeMutationErrorCode
): { ok: false; code: ParamFreeMutationErrorCode } => ({ ok: false, code })

// `acceptInvitationPolicy` surfaces the fetched invitation on success so
// the caller can drive the "create membership + delete invitation" side
// effect without a second round trip.
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
