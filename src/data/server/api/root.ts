import { appTestRouter } from './routers/app-test'
import { powersyncRouter } from './routers/powersync'
import { userRouter } from './routers/user'
import { createTRPCRouter } from './trpc'

export const appRouter = createTRPCRouter({
  appTest: appTestRouter,
  powersync: powersyncRouter,
  user: userRouter
})

export type AppRouter = typeof appRouter
