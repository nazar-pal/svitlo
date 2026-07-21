import { clientLookup } from '@/data/client/registry'
import { buildCheckFacade, type CheckFacade } from '@/data/shared/checks'
import type { ClientDb } from '@/lib/powersync/database'

import type { WriteTx } from './tx'

export interface MutationContext {
  readonly db: ClientDb
  readonly checks: CheckFacade
  readonly newId: () => string
  readonly now: () => Date
  readonly writeTx: WriteTx
}

export function buildClientChecks(db: ClientDb): CheckFacade {
  return buildCheckFacade(clientLookup(db))
}
