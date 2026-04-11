import {
  clientAuthzProvider,
  createClientAuthzProvider
} from '@/data/client/authz/provider'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import {
  createOrganizationLifecycleChecks,
  type OrganizationLifecycleChecks
} from '@/data/shared/organizations'
import type { ClientDb } from '@/lib/powersync/database'

import {
  clientOrganizationFactsProvider,
  createClientOrganizationFactsProvider
} from './provider'

export function createClientOrganizationLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): OrganizationLifecycleChecks {
  return createOrganizationLifecycleChecks(
    createClientOrganizationFactsProvider(db),
    authz
  )
}

// Singleton wrapper: uses the singleton facts + singleton authz, both of which
// already defer `productionDb` access until method-call time. Kept until the
// MutationContext refactor lands and all callers use the factory form.
const authz = createAuthzChecks(clientAuthzProvider)

export const organizationLifecycleChecks = createOrganizationLifecycleChecks(
  clientOrganizationFactsProvider,
  authz
)
