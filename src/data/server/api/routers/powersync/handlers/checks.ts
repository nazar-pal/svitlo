import { createServerAuthz } from '@/data/server/authz'
import {
  createServerAssignmentFactsProvider,
  createServerGeneratorFactsProvider,
  createServerInvitationFactsProvider,
  createServerMaintenanceFactsProvider,
  createServerMemberFactsProvider,
  createServerOrganizationFactsProvider,
  createServerSessionFactsProvider
} from '@/data/server/facts-providers'
import {
  buildLifecycleChecks,
  type LifecycleChecks
} from '@/data/shared/lifecycle-checks'

import type { Db } from './types'

const serverFactsProviders = {
  organizations: createServerOrganizationFactsProvider,
  generators: createServerGeneratorFactsProvider,
  invitations: createServerInvitationFactsProvider,
  sessions: createServerSessionFactsProvider,
  maintenance: createServerMaintenanceFactsProvider,
  members: createServerMemberFactsProvider,
  assignments: createServerAssignmentFactsProvider
} as const

export function buildServerChecks(db: Db): LifecycleChecks {
  const authz = createServerAuthz(db)
  return buildLifecycleChecks(db, serverFactsProviders, authz)
}
