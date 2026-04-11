import type { AuthzChecks } from '@/data/shared/authz'
import type { PolicyResult } from '@/data/shared/policy-result'

import type { OrganizationFactsProvider } from './facts'
import * as policy from './policy'
import type { DeleteOrganizationResult } from './policy'

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
      return policy.renameOrganizationPolicy({ org, isCallerOrgAdmin })
    },

    async deleteOrganization(callerUserId, organizationId) {
      const [org, isCallerOrgAdmin] = await Promise.all([
        facts.findOrganization(organizationId),
        authz.isOrgAdmin(callerUserId, organizationId)
      ])
      return policy.deleteOrganizationPolicy({ org, isCallerOrgAdmin })
    }
  }
}
