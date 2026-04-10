import { createServerAuthz } from '@/data/server/authz'
import {
  createGeneratorLifecycleChecks,
  type GeneratorLifecycleChecks
} from '@/data/shared/generators'

import { createServerGeneratorFactsProvider } from './provider'

type Db = Parameters<typeof createServerGeneratorFactsProvider>[0]

export function createServerGeneratorChecks(db: Db): GeneratorLifecycleChecks {
  return createGeneratorLifecycleChecks(
    createServerGeneratorFactsProvider(db),
    createServerAuthz(db)
  )
}
