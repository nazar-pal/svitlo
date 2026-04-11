import { createServerAuthz } from '@/data/server/authz'
import {
  createInvitationLifecycleChecks,
  type InvitationLifecycleChecks
} from '@/data/shared/invitations'

import { createServerInvitationFactsProvider } from './provider'

type Db = Parameters<typeof createServerInvitationFactsProvider>[0]

export function createServerInvitationChecks(
  db: Db
): InvitationLifecycleChecks {
  return createInvitationLifecycleChecks(
    createServerInvitationFactsProvider(db),
    createServerAuthz(db)
  )
}
