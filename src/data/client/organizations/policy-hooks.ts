// Reactive org-authz primitive for policy hooks. Shares the same SQL as the
// async facts provider (mutation path) via `getOrgAuthzFactsQuery`, but drives
// it through `useDrizzleQuery` so sibling `policy-hooks.ts` files in
// invitations/members can subscribe and gate UI affordances reactively.

import { getOrgAuthzFactsQuery } from '@/data/client/authz/provider'
import { policy as authzPolicy } from '@/data/shared/authz'
import type { OrganizationRef } from '@/data/shared/organizations'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { db } from '@/lib/powersync/database'

// Matches the `PolicyView` shape from `policy-hooks-shared` so every reactive
// hook in this layer (facts + policy) narrows via a single `status` check.
type OrgAuthzFactsView =
  | { status: 'loading' }
  | {
      status: 'ready'
      org: OrganizationRef | null
      isCallerOrgAdmin: boolean
    }

const LOADING_ORG_FACTS: OrgAuthzFactsView = { status: 'loading' }

export function useOrgAuthzFacts(
  userId: string | null | undefined,
  organizationId: string | null | undefined
): OrgAuthzFactsView {
  const query =
    userId && organizationId
      ? getOrgAuthzFactsQuery(db, organizationId)
      : undefined

  const { data, isLoading } = useDrizzleQuery(query)

  if (!userId || !organizationId || isLoading) return LOADING_ORG_FACTS

  const row = data[0]
  if (!row) return { status: 'ready', org: null, isCallerOrgAdmin: false }

  return {
    status: 'ready',
    org: { id: organizationId, adminUserId: row.adminUserId },
    isCallerOrgAdmin: authzPolicy.isOrgAdmin(userId, row.adminUserId)
  }
}
