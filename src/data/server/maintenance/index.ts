import { createServerAuthz } from '@/data/server/authz'
import {
  createMaintenanceLifecycleChecks,
  type MaintenanceLifecycleChecks
} from '@/data/shared/maintenance'

import { createServerMaintenanceFactsProvider } from './provider'

type Db = Parameters<typeof createServerMaintenanceFactsProvider>[0]

export function createServerMaintenanceChecks(
  db: Db
): MaintenanceLifecycleChecks {
  return createMaintenanceLifecycleChecks(
    createServerMaintenanceFactsProvider(db),
    createServerAuthz(db)
  )
}
