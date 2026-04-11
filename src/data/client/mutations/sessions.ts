import { eq } from 'drizzle-orm'

import { generatorSessions } from '@/data/client/db-schema'
import { fail, ok, type MutationResult } from '@/data/shared/result'

import type { MutationContext } from './context'

export function createSessionMutations(ctx: MutationContext) {
  return {
    async startSession(
      userId: string,
      generatorId: string
    ): Promise<MutationResult> {
      const result = await ctx.checks.sessions.startSession(userId, generatorId)
      if (!result.ok) return fail(result.code)

      await ctx.db.insert(generatorSessions).values({
        id: ctx.newId(),
        generatorId,
        startedByUserId: userId,
        stoppedByUserId: null,
        startedAt: ctx.now().toISOString(),
        stoppedAt: null
      })

      return ok
    },

    async deleteSession(
      userId: string,
      sessionId: string
    ): Promise<MutationResult> {
      const result = await ctx.checks.sessions.deleteSession(userId, sessionId)
      if (!result.ok) return fail(result.code)

      await ctx.db
        .delete(generatorSessions)
        .where(eq(generatorSessions.id, sessionId))

      return ok
    },

    async stopSession(
      userId: string,
      sessionId: string
    ): Promise<MutationResult> {
      const result = await ctx.checks.sessions.stopSession(userId, sessionId)
      if (!result.ok) return fail(result.code)

      await ctx.db
        .update(generatorSessions)
        .set({
          stoppedAt: ctx.now().toISOString(),
          stoppedByUserId: userId
        })
        .where(eq(generatorSessions.id, sessionId))

      return ok
    },

    async updateSession(
      userId: string,
      sessionId: string,
      input: { startedAt: string; stoppedAt: string }
    ): Promise<MutationResult> {
      const result = await ctx.checks.sessions.updateSession(
        userId,
        sessionId,
        input,
        ctx.now()
      )
      if (!result.ok) return fail(result.code)

      await ctx.db
        .update(generatorSessions)
        .set({
          startedAt: input.startedAt,
          stoppedAt: input.stoppedAt
        })
        .where(eq(generatorSessions.id, sessionId))

      return ok
    },

    async logManualSession(
      userId: string,
      input: { generatorId: string; startedAt: string; stoppedAt: string }
    ): Promise<MutationResult> {
      const result = await ctx.checks.sessions.logManualSession(
        userId,
        input,
        ctx.now()
      )
      if (!result.ok) return fail(result.code)

      const { generatorId, startedAt, stoppedAt } = input

      await ctx.db.insert(generatorSessions).values({
        id: ctx.newId(),
        generatorId,
        startedByUserId: userId,
        stoppedByUserId: userId,
        startedAt,
        stoppedAt
      })

      return ok
    }
  }
}
