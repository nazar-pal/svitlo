// Pure organization-lifecycle rules. No I/O. Callers fetch facts, then ask
// the policy. Both client (PowerSync SQLite) and server (Postgres) reuse
// these so the rule set lives in exactly one place.
//
// `createOrganization` has no business rules — Zod validation is the only
// gate — so it is intentionally not represented here, mirroring the pattern
// used by `assignments` and `sessions`.

import type { ParamFreeMutationErrorCode } from '@/data/shared/errors'
import type { PolicyResult } from '@/data/shared/policy-result'

import type { OrganizationRef } from './facts'

// Local `fail` helper so the return type narrows to just the failure
// variant — `policyFail` returns the wider `PolicyResult` which breaks
// inference for the richer success shape below.
const fail = (
  code: ParamFreeMutationErrorCode
): { ok: false; code: ParamFreeMutationErrorCode } => ({ ok: false, code })

export type { PolicyResult }

// Delete surfaces the resolved org so the caller can drive the cascade
// side effect (client: raw SQL tx; server: Postgres FK cascade) without a
// second lookup. Mirrors `RemoveMemberResult` in `@/data/shared/members`.
export type DeleteOrganizationResult =
  | { ok: true; org: OrganizationRef }
  | Exclude<PolicyResult, { ok: true }>

export const renameOrganizationPolicy = (facts: {
  org: OrganizationRef | null
  isCallerOrgAdmin: boolean
}): PolicyResult => {
  if (!facts.org) return fail('ORGANIZATION_NOT_FOUND')
  if (!facts.isCallerOrgAdmin) return fail('ONLY_ADMIN_CAN_RENAME_ORG')
  return { ok: true }
}

export const deleteOrganizationPolicy = (facts: {
  org: OrganizationRef | null
  isCallerOrgAdmin: boolean
}): DeleteOrganizationResult => {
  if (!facts.org) return fail('ORGANIZATION_NOT_FOUND')
  if (!facts.isCallerOrgAdmin) return fail('ONLY_ADMIN_CAN_DELETE_ORG')
  return { ok: true, org: facts.org }
}
