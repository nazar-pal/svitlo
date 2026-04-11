import {
  createAssignmentLifecycleChecks,
  type AssignmentLifecycleChecks
} from '@/data/shared/assignments'
import { createServerAuthz } from '@/data/server/authz'

import { createServerAssignmentFactsProvider } from './provider'

type Db = Parameters<typeof createServerAssignmentFactsProvider>[0]

export function createServerAssignmentChecks(
  db: Db
): AssignmentLifecycleChecks {
  return createAssignmentLifecycleChecks(
    createServerAssignmentFactsProvider(db),
    createServerAuthz(db)
  )
}
