import { createTRPCRouter, protectedProcedure } from '../trpc'

export const userRouter = createTRPCRouter({
  me: protectedProcedure.query(({ ctx }) => ({
    user: ctx.session.user,
    session: {
      id: ctx.session.session.id,
      expiresAt: ctx.session.session.expiresAt
    }
  }))
})
