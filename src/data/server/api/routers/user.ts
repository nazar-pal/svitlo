import { protectedProcedure } from '../orpc'

export const userRouter = {
  me: protectedProcedure.handler(({ context }) => ({
    user: context.session.user,
    session: {
      id: context.session.session.id,
      expiresAt: context.session.session.expiresAt
    }
  }))
}
