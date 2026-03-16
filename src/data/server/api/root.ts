import { lazy } from '@orpc/server'

import { appTestRouter } from './routers/app-test'
import { powersyncRouter } from './routers/powersync'
import { userRouter } from './routers/user'

export const appRouter = {
  ai: lazy(async () => {
    const { aiRouter } = await import('./routers/ai')
    return { default: aiRouter }
  }),
  appTest: appTestRouter,
  powersync: powersyncRouter,
  user: userRouter
}

export type AppRouter = typeof appRouter
