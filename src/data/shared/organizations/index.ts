import type { AuthzChecks } from '@/data/shared/authz'
import type { ParamFreeMutationErrorCode } from '@/data/shared/errors'
import type { PolicyResult } from '@/data/shared/policy-result'

export type { PolicyResult }

// --- Facts port ---

// Fact shapes the organization-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

// `adminUserId` lives on the ref so the delete side effect can carry the
// resolved org through to its caller without a second lookup, matching the
// shape of `RemoveMemberResult` in `@/data/shared/members`.
export interface OrganizationRef {
  id: string
  adminUserId: string
}

// Port: adapters answer "does this organization exist, and who is its admin".
// Both client (SQLite) and server (Postgres) implement it against their own
// dialect.
export interface OrganizationFactsProvider {
  findOrganization(id: string): Promise<OrganizationRef | null>
}

// --- Pure policy rules ---

// Pure organization-lifecycle rules. No I/O. Callers fetch facts, then ask
// the policy. Both client (PowerSync SQLite) and server (Postgres) reuse
// these so the rule set lives in exactly one place.
//
// `createOrganization` has no business rules — Zod validation is the only
// gate — so it is intentionally not represented here, mirroring the pattern
// used by `assignments` and `sessions`.

// Local `fail` helper so the return type narrows to just the failure
// variant — `policyFail` returns the wider `PolicyResult` which breaks
// inference for the richer success shape below.
const fail = (
  code: ParamFreeMutationErrorCode
): { ok: false; code: ParamFreeMutationErrorCode } => ({ ok: false, code })

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

// --- Lifecycle orchestrator — wires facts + authz → policy ---

export interface OrganizationLifecycleChecks {
  renameOrganization(
    callerUserId: string,
    organizationId: string
  ): Promise<PolicyResult>
  deleteOrganization(
    callerUserId: string,
    organizationId: string
  ): Promise<DeleteOrganizationResult>
}

// Single source of truth for organization-lifecycle decisions. Both client
// (PowerSync SQLite) and server (Postgres) adapters funnel through here —
// each side only customises how facts get fetched and how authz is built.
export function createOrganizationLifecycleChecks(
  facts: OrganizationFactsProvider,
  authz: AuthzChecks
): OrganizationLifecycleChecks {
  return {
    async renameOrganization(callerUserId, organizationId) {
      const [org, isCallerOrgAdmin] = await Promise.all([
        facts.findOrganization(organizationId),
        authz.isOrgAdmin(callerUserId, organizationId)
      ])
      return renameOrganizationPolicy({ org, isCallerOrgAdmin })
    },

    async deleteOrganization(callerUserId, organizationId) {
      const [org, isCallerOrgAdmin] = await Promise.all([
        facts.findOrganization(organizationId),
        authz.isOrgAdmin(callerUserId, organizationId)
      ])
      return deleteOrganizationPolicy({ org, isCallerOrgAdmin })
    }
  }
}
