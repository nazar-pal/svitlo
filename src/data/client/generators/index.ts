import { createClientAuthzProvider } from '@/data/client/authz/provider'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import {
  createGeneratorLifecycleChecks,
  type GeneratorLifecycleChecks
} from '@/data/shared/generators'
import type { ClientDb } from '@/lib/powersync/database'

import { createClientGeneratorFactsProvider } from './provider'

export function createClientGeneratorLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): GeneratorLifecycleChecks {
  return createGeneratorLifecycleChecks(
    createClientGeneratorFactsProvider(db),
    authz
  )
}
