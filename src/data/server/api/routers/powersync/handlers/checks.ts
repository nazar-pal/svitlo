import { serverLookup } from '@/data/server/registry'
import * as authz from '@/data/shared/authz/decisions'
import { buildCheckFacade, type CheckFacade } from '@/data/shared/checks'
import { runDecisionAsync } from '@/data/shared/facts/async-adapter'

import type { Db } from './types'

export function buildServerChecks(db: Db): CheckFacade {
  return buildCheckFacade(serverLookup(db))
}

// Server-only defence-in-depth shared by the session and maintenance-record
// handlers: the shared policy allows any user with generator access
// (matching client behaviour), while the server additionally requires the
// caller to own the row or be an org admin. Reuses the row the policy
// already fetched — no second fetch of the entity itself.
export async function isOwnerOrGeneratorAdmin(
  db: Db,
  userId: string,
  generatorId: string,
  ownerUserId: string
): Promise<boolean> {
  if (ownerUserId === userId) return true
  const adminCheck = await runDecisionAsync(
    authz.isGeneratorOrgAdmin,
    { userId, generatorId },
    serverLookup(db)
  )
  return adminCheck.ok
}
