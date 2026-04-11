// Pure member-lifecycle rules. No I/O. Callers fetch facts, then ask the
// policy. Both client (PowerSync SQLite) and server (Postgres) reuse these
// so the rule set lives in exactly one place — per spec §4.5, removing a
// member or leaving an org must transfer the departing user's generator
// assignments to the org admin.

import type { ParamFreeMutationErrorCode } from '@/data/shared/errors'
import type { PolicyResult } from '@/data/shared/policy-result'

import type { MemberRef } from './facts'

// Local `fail` helper so the return type narrows to just the failure
// variant — `policyFail` returns the wider `PolicyResult` which breaks
// inference for the richer success shapes below.
const fail = (
  code: ParamFreeMutationErrorCode
): { ok: false; code: ParamFreeMutationErrorCode } => ({ ok: false, code })

export type { PolicyResult }

// Admin-initiated removal. Returns the resolved member so the caller can
// drive the transfer-and-delete side effect without a second lookup.
export type RemoveMemberResult =
  | { ok: true; member: MemberRef; adminUserId: string }
  | Exclude<PolicyResult, { ok: true }>

// Self-initiated leave. Same success shape as RemoveMemberResult so both
// entry points can share the downstream side-effect code.
export type LeaveOrganizationResult =
  | { ok: true; member: MemberRef; adminUserId: string }
  | Exclude<PolicyResult, { ok: true }>

export const removeMemberPolicy = (facts: {
  member: MemberRef | null
  isCallerOrgAdmin: boolean
  adminUserId: string | null
}): RemoveMemberResult => {
  if (!facts.member) return fail('MEMBER_NOT_FOUND')
  if (!facts.isCallerOrgAdmin) return fail('ONLY_ADMIN_CAN_REMOVE_MEMBERS')
  if (!facts.adminUserId) return fail('ORGANIZATION_NOT_FOUND')
  return { ok: true, member: facts.member, adminUserId: facts.adminUserId }
}

export const leaveOrganizationPolicy = (facts: {
  member: MemberRef | null
  isCallerOrgAdmin: boolean
  adminUserId: string | null
}): LeaveOrganizationResult => {
  // Admin check runs first so an admin trying to leave their own org gets
  // the clearer ADMIN_CANNOT_LEAVE instead of the generic NOT_MEMBER_OF_ORG.
  if (facts.isCallerOrgAdmin) return fail('ADMIN_CANNOT_LEAVE')
  if (!facts.member) return fail('NOT_MEMBER_OF_ORG')
  if (!facts.adminUserId) return fail('ORGANIZATION_NOT_FOUND')
  return { ok: true, member: facts.member, adminUserId: facts.adminUserId }
}
