import { db } from '@/data/server'
import { auth } from '@/data/server/auth'
import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import { z } from 'zod'

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 */
export const createTRPCContext = async (opts: { req: Request }) => {
  const session = await auth.api.getSession({
    headers: opts.req.headers
  })

  return {
    db,
    session,
    headers: opts.req.headers
  }
}

/**
 * 2. INITIALIZATION
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter: ({ shape, error }) => ({
    ...shape,
    data: {
      ...shape.data,
      zodError:
        error.cause instanceof z.ZodError ? z.treeifyError(error.cause) : null
    }
  })
})

/**
 * Create a server-side caller
 */
export const createCallerFactory = t.createCallerFactory

/**
 * 3. ROUTER & PROCEDURE
 */

export const createTRPCRouter = t.router

/**
 * Public (unauthed) procedure
 */
export const publicProcedure = t.procedure

/**
 * Protected (authenticated) procedure
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      session: ctx.session
    }
  })
})
