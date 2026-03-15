import { os, ORPCError } from '@orpc/server'

import { db } from '@/data/server'
import { auth } from '@/data/server/auth'

interface Context {
  db: typeof db
  session: Awaited<ReturnType<typeof auth.api.getSession>>
  headers: Headers
}

const base = os.$context<Context>()

export const publicProcedure = base

export const protectedProcedure = base.use(({ context, next }) => {
  if (!context.session) throw new ORPCError('UNAUTHORIZED')
  return next({ context: { session: context.session } })
})

export type { Context }
