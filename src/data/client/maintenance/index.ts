import { createClientAuthzProvider } from '@/data/client/authz/provider'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import {
  createMaintenanceLifecycleChecks,
  type MaintenanceLifecycleChecks
} from '@/data/shared/maintenance'
import type { ClientDb } from '@/lib/powersync/database'

import { createClientMaintenanceFactsProvider } from './provider'

export function createClientMaintenanceLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): MaintenanceLifecycleChecks {
  return createMaintenanceLifecycleChecks(
    createClientMaintenanceFactsProvider(db),
    authz
  )
}
