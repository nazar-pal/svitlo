import {
  clientAuthzProvider,
  createClientAuthzProvider
} from '@/data/client/authz/provider'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import {
  createMemberLifecycleChecks,
  type MemberLifecycleChecks
} from '@/data/shared/members'
import type { ClientDb } from '@/lib/powersync/database'

import {
  clientMemberFactsProvider,
  createClientMemberFactsProvider
} from './provider'

export function createClientMemberLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): MemberLifecycleChecks {
  return createMemberLifecycleChecks(
    createClientMemberFactsProvider(db),
    authz
  )
}

// Singleton wrapper: see note in organizations/index.ts.
const authz = createAuthzChecks(clientAuthzProvider)

export const memberLifecycleChecks = createMemberLifecycleChecks(
  clientMemberFactsProvider,
  authz
)
