import { createAuthzChecks, type AuthzChecks } from '@/data/shared/authz'

import { createServerAuthzProvider } from './provider'

type Db = Parameters<typeof createServerAuthzProvider>[0]

export function createServerAuthz(db: Db): AuthzChecks {
  return createAuthzChecks(createServerAuthzProvider(db))
}
