import {
  clientAuthzProvider,
  createClientAuthzProvider
} from '@/data/client/authz/provider'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import {
  createInvitationLifecycleChecks,
  type InvitationLifecycleChecks
} from '@/data/shared/invitations'
import type { ClientDb } from '@/lib/powersync/database'

import {
  clientInvitationFactsProvider,
  createClientInvitationFactsProvider
} from './provider'

export function createClientInvitationLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): InvitationLifecycleChecks {
  return createInvitationLifecycleChecks(
    createClientInvitationFactsProvider(db),
    authz
  )
}

// Singleton wrapper: see note in organizations/index.ts.
const authz = createAuthzChecks(clientAuthzProvider)

export const invitationLifecycleChecks = createInvitationLifecycleChecks(
  clientInvitationFactsProvider,
  authz
)
