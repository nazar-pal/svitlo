import { createClientAuthzProvider } from '@/data/client/authz/provider'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import {
  createInvitationLifecycleChecks,
  type InvitationLifecycleChecks
} from '@/data/shared/invitations'
import type { ClientDb } from '@/lib/powersync/database'

import { createClientInvitationFactsProvider } from './provider'

export function createClientInvitationLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): InvitationLifecycleChecks {
  return createInvitationLifecycleChecks(
    createClientInvitationFactsProvider(db),
    authz
  )
}
