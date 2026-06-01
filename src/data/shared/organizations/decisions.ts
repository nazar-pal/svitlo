import * as authzPolicy from '@/data/shared/authz/policy'
import { defineDecision, factPlanFor } from '@/data/shared/facts/decisions'

import {
  deleteOrganizationPolicy,
  renameOrganizationPolicy,
  type OrganizationRef,
  type PolicyResult
} from './index'

// `organization.byId` returns `{ id, adminUserId }` — a strict superset of
// what `authz.org` exposes against the same row by the same id. One lookup
// is enough; `isOrgAdmin` reads `adminUserId` off the same fact.

// ── renameOrganization ──────────────────────────────────────────────────────

export interface RenameOrganizationArgs {
  callerUserId: string
  organizationId: string
}

interface RenameOrganizationFacts {
  org: OrganizationRef | null
}

const renameOrganizationPlan = factPlanFor<
  RenameOrganizationArgs,
  RenameOrganizationFacts
>()

export const renameOrganization = defineDecision<
  RenameOrganizationArgs,
  RenameOrganizationFacts,
  PolicyResult
>({
  id: 'organizations.renameOrganization',
  plan: [
    renameOrganizationPlan('org', 'organization.byId', a => a.organizationId)
  ],
  rule: (args, facts) =>
    renameOrganizationPolicy({
      org: facts.org,
      isCallerOrgAdmin: authzPolicy.isOrgAdmin(
        args.callerUserId,
        facts.org?.adminUserId ?? null
      )
    })
})

// ── deleteOrganization ──────────────────────────────────────────────────────

export interface DeleteOrganizationArgs {
  callerUserId: string
  organizationId: string
}

interface DeleteOrganizationFacts {
  org: OrganizationRef | null
}

const deleteOrganizationPlan = factPlanFor<
  DeleteOrganizationArgs,
  DeleteOrganizationFacts
>()

export const deleteOrganization = defineDecision<
  DeleteOrganizationArgs,
  DeleteOrganizationFacts,
  ReturnType<typeof deleteOrganizationPolicy>
>({
  id: 'organizations.deleteOrganization',
  plan: [
    deleteOrganizationPlan('org', 'organization.byId', a => a.organizationId)
  ],
  rule: (args, facts) =>
    deleteOrganizationPolicy({
      org: facts.org,
      isCallerOrgAdmin: authzPolicy.isOrgAdmin(
        args.callerUserId,
        facts.org?.adminUserId ?? null
      )
    })
})
