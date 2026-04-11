import { createClientAuthzProvider } from '@/data/client/authz/provider'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import {
  createSessionLifecycleChecks,
  type SessionLifecycleChecks
} from '@/data/shared/sessions'
import type { ClientDb } from '@/lib/powersync/database'

import { createClientSessionFactsProvider } from './provider'

export function createClientSessionLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): SessionLifecycleChecks {
  return createSessionLifecycleChecks(
    createClientSessionFactsProvider(db),
    authz
  )
}
