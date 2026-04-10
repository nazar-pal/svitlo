import { createServerAuthz } from '@/data/server/authz'
import {
  createSessionLifecycleChecks,
  type SessionLifecycleChecks
} from '@/data/shared/sessions'

import { createServerSessionFactsProvider } from './provider'

type Db = Parameters<typeof createServerSessionFactsProvider>[0]

export function createServerSessionChecks(db: Db): SessionLifecycleChecks {
  return createSessionLifecycleChecks(
    createServerSessionFactsProvider(db),
    createServerAuthz(db)
  )
}
