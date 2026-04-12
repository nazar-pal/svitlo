import { createClientAuthzProvider } from '@/data/client/authz/provider'
import {
  createClientAssignmentFactsProvider,
  createClientGeneratorFactsProvider,
  createClientInvitationFactsProvider,
  createClientMaintenanceFactsProvider,
  createClientMemberFactsProvider,
  createClientOrganizationFactsProvider,
  createClientSessionFactsProvider
} from '@/data/client/facts-providers'
import { createAuthzChecks } from '@/data/shared/authz'
import {
  buildLifecycleChecks,
  type LifecycleChecks
} from '@/data/shared/lifecycle-checks'
import type { ClientDb } from '@/lib/powersync/database'

import type { WriteTx } from './tx'

export interface MutationContext {
  readonly db: ClientDb
  readonly checks: LifecycleChecks
  readonly newId: () => string
  readonly now: () => Date
  readonly writeTx: WriteTx
}

const clientFactsProviders = {
  organizations: createClientOrganizationFactsProvider,
  generators: createClientGeneratorFactsProvider,
  invitations: createClientInvitationFactsProvider,
  sessions: createClientSessionFactsProvider,
  maintenance: createClientMaintenanceFactsProvider,
  members: createClientMemberFactsProvider,
  assignments: createClientAssignmentFactsProvider
} as const

export function buildClientChecks(db: ClientDb): LifecycleChecks {
  const authz = createAuthzChecks(createClientAuthzProvider(db))
  return buildLifecycleChecks(db, clientFactsProviders, authz)
}
