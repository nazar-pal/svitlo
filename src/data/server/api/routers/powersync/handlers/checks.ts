import { serverLookup } from '@/data/server/registry'
import * as authzPolicy from '@/data/shared/authz/policy'
import { buildCheckFacade, type CheckFacade } from '@/data/shared/checks'

import type { Db } from './types'

export function buildServerChecks(db: Db): CheckFacade {
  return buildCheckFacade(serverLookup(db))
}

// Server-only defence-in-depth shared by the session and maintenance-record
// handlers: the shared policy allows any user with generator access
// (matching client behaviour), while the server additionally requires the
// caller to own the row or be the generator's org admin. Both inputs come
// from facts the decision already resolved — no second round trip. Callers
// must pass the fact from the SAME decision result, not one resolved
// elsewhere. A missing fact fails closed.
export const isOwnerOrGeneratorAdmin = (
  userId: string,
  ownerUserId: string,
  generatorFact: authzPolicy.GeneratorAuthzFact | null | undefined
): boolean =>
  ownerUserId === userId ||
  authzPolicy.isOrgAdmin(userId, generatorFact?.orgAdminUserId ?? null)
