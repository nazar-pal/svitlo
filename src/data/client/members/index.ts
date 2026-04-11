import { createClientAuthzProvider } from '@/data/client/authz/provider'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import {
  createMemberLifecycleChecks,
  type MemberLifecycleChecks
} from '@/data/shared/members'
import type { ClientDb } from '@/lib/powersync/database'

import { createClientMemberFactsProvider } from './provider'

export function createClientMemberLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): MemberLifecycleChecks {
  return createMemberLifecycleChecks(
    createClientMemberFactsProvider(db),
    authz
  )
}
