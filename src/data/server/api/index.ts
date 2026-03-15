import type { InferRouterInputs, InferRouterOutputs } from '@orpc/server'

import type { AppRouter } from './root'
import { appRouter } from './root'

type RouterInputs = InferRouterInputs<typeof appRouter>
type RouterOutputs = InferRouterOutputs<typeof appRouter>

export { appRouter }
export type { AppRouter, RouterInputs, RouterOutputs }
