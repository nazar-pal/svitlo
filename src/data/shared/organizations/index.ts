import type { ParamFreeMutationErrorCode } from '@/data/shared/errors'
import type { PolicyResult } from '@/data/shared/policy-result'

export type { PolicyResult }

// Fact shape the organization-lifecycle policy needs. `adminUserId` lives
// on the ref so the delete side effect can carry the resolved org through
// to its caller without a second lookup.
export interface OrganizationRef {
  id: string
  adminUserId: string
}

// Local `fail` helper so the return type narrows to just the failure
// variant — `policyFail` returns the wider `PolicyResult` which breaks
// inference for the richer success shape below.
const fail = (
  code: ParamFreeMutationErrorCode
): { ok: false; code: ParamFreeMutationErrorCode } => ({ ok: false, code })

// Delete surfaces the resolved org so the caller can drive the cascade
// side effect (client: raw SQL tx; server: Postgres FK cascade) without a
// second lookup.
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
