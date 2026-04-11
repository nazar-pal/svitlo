import { createServerAuthz } from '@/data/server/authz'
import {
  createMemberLifecycleChecks,
  type MemberLifecycleChecks
} from '@/data/shared/members'

import { createServerMemberFactsProvider } from './provider'

type Db = Parameters<typeof createServerMemberFactsProvider>[0]

export function createServerMemberChecks(db: Db): MemberLifecycleChecks {
  return createMemberLifecycleChecks(
    createServerMemberFactsProvider(db),
    createServerAuthz(db)
  )
}
