import {
  clientAuthzProvider,
  createClientAuthzProvider
} from '@/data/client/authz/provider'
import {
  createAssignmentLifecycleChecks,
  type AssignmentLifecycleChecks
} from '@/data/shared/assignments'
import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'
import type { ClientDb } from '@/lib/powersync/database'

import {
  clientAssignmentFactsProvider,
  createClientAssignmentFactsProvider
} from './provider'

export function createClientAssignmentLifecycleChecks(
  db: ClientDb,
  authz: AuthzChecks = createAuthzChecks(createClientAuthzProvider(db))
): AssignmentLifecycleChecks {
  return createAssignmentLifecycleChecks(
    createClientAssignmentFactsProvider(db),
    authz
  )
}

// Singleton wrapper: see note in organizations/index.ts.
const authz = createAuthzChecks(clientAuthzProvider)

export const assignmentLifecycleChecks = createAssignmentLifecycleChecks(
  clientAssignmentFactsProvider,
  authz
)
