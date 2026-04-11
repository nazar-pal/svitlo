import { createServerAuthz } from '@/data/server/authz'
import {
  createOrganizationLifecycleChecks,
  type OrganizationLifecycleChecks
} from '@/data/shared/organizations'

import { createServerOrganizationFactsProvider } from './provider'

type Db = Parameters<typeof createServerOrganizationFactsProvider>[0]

export function createServerOrganizationChecks(
  db: Db
): OrganizationLifecycleChecks {
  return createOrganizationLifecycleChecks(
    createServerOrganizationFactsProvider(db),
    createServerAuthz(db)
  )
}
