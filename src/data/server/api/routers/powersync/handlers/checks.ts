import { serverLookup } from '@/data/server/registry'
import { buildCheckFacade, type CheckFacade } from '@/data/shared/checks'

import type { Db } from './types'

export function buildServerChecks(db: Db): CheckFacade {
  return buildCheckFacade(serverLookup(db))
}
