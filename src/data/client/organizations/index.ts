import { createClientAuthzProvider } from '@/data/client/authz/provider'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import {
  createOrganizationLifecycleChecks,
  type OrganizationLifecycleChecks
} from '@/data/shared/organizations'
import type { ClientDb } from '@/lib/powersync/database'

import { createClientOrganizationFactsProvider } from './provider'

export function createClientOrganizationLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): OrganizationLifecycleChecks {
  return createOrganizationLifecycleChecks(
    createClientOrganizationFactsProvider(db),
    authz
  )
}
