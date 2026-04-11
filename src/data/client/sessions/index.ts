import {
  clientAuthzProvider,
  createClientAuthzProvider
} from '@/data/client/authz/provider'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import {
  createSessionLifecycleChecks,
  type SessionLifecycleChecks
} from '@/data/shared/sessions'
import type { ClientDb } from '@/lib/powersync/database'

import {
  clientSessionFactsProvider,
  createClientSessionFactsProvider
} from './provider'

export function createClientSessionLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): SessionLifecycleChecks {
  return createSessionLifecycleChecks(
    createClientSessionFactsProvider(db),
    authz
  )
}

// Singleton wrapper: see note in organizations/index.ts.
const authz = createAuthzChecks(clientAuthzProvider)

export const sessionLifecycleChecks = createSessionLifecycleChecks(
  clientSessionFactsProvider,
  authz
)
