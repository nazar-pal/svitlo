import { eq } from 'drizzle-orm'
import { SignJWT } from 'jose'
import { z } from 'zod'

import { user as userTable } from '@/data/server/db-schema'
import { env } from '@/env'

import { createTRPCRouter, protectedProcedure } from '../trpc'

const SECRET = new TextEncoder().encode(env.POWERSYNC_PRIVATE_KEY)

// Short-lived token — PowerSync SDK auto-refreshes via fetchCredentials
const TOKEN_LIFETIME_SECONDS = 5 * 60

export const powersyncRouter = createTRPCRouter({
  token: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.user.id
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now + TOKEN_LIFETIME_SECONDS

    const token = await new SignJWT({ sub: userId, iat: now, exp: expiresAt })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT', kid: 'svitlo-dev-1' })
      .setAudience(env.POWERSYNC_URL)
      .sign(SECRET)

    return {
      token,
      endpoint: env.POWERSYNC_URL,
      expiresAt: new Date(expiresAt * 1000).toISOString()
    }
  }),

  applyWrite: protectedProcedure
    .input(
      z.object({
        table: z.string(),
        op: z.enum(['insert', 'update', 'delete']),
        id: z.string(),
        data: z.record(z.string(), z.unknown()).optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      // PowerSync requires 2xx responses — never throw, return error flags instead
      if (input.table === 'user' && input.op === 'update') {
        if (input.id !== ctx.session.user.id) {
          return { ok: false, error: 'Cannot update another user' }
        }

        const allowedFields: Record<string, unknown> = {}
        if (input.data && typeof input.data.name === 'string') {
          allowedFields.name = input.data.name
        }
        if (
          input.data &&
          (typeof input.data.image === 'string' || input.data.image === null)
        ) {
          allowedFields.image = input.data.image
        }

        if (Object.keys(allowedFields).length > 0) {
          await ctx.db
            .update(userTable)
            .set(allowedFields)
            .where(eq(userTable.id, input.id))
        }

        return { ok: true }
      }

      return { ok: false, error: `Unhandled table: ${input.table}` }
    })
})
