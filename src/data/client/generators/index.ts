import {
  clientAuthzProvider,
  createClientAuthzProvider
} from '@/data/client/authz/provider'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import {
  createGeneratorLifecycleChecks,
  type GeneratorLifecycleChecks
} from '@/data/shared/generators'
import type { ClientDb } from '@/lib/powersync/database'

import {
  clientGeneratorFactsProvider,
  createClientGeneratorFactsProvider
} from './provider'

export function createClientGeneratorLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): GeneratorLifecycleChecks {
  return createGeneratorLifecycleChecks(
    createClientGeneratorFactsProvider(db),
    authz
  )
}

// Singleton wrapper: see note in organizations/index.ts.
const authz = createAuthzChecks(clientAuthzProvider)

export const generatorLifecycleChecks = createGeneratorLifecycleChecks(
  clientGeneratorFactsProvider,
  authz
)
