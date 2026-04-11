import { clientAuthzProvider } from '@/data/client/authz/provider'
import { createAuthzChecks } from '@/data/shared/authz'
import { createMaintenanceLifecycleChecks } from '@/data/shared/maintenance'

import { clientMaintenanceFactsProvider } from './provider'

// Own AuthzChecks instance (not imported from `@/data/client/authz`) to
// avoid a circular barrel dependency if this module is ever re-exported
// from `@/data/client`. The provider is a module-level singleton so this
// is cheap.
const authz = createAuthzChecks(clientAuthzProvider)

export const maintenanceLifecycleChecks = createMaintenanceLifecycleChecks(
  clientMaintenanceFactsProvider,
  authz
)
