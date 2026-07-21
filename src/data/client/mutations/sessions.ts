import { eq } from 'drizzle-orm'

import { generatorSessions } from '@/data/client/db-schema'

import type { MutationContext } from './context'
import { defineMutation } from './pipeline'

export function createSessionMutations(ctx: MutationContext) {
  return {
    startSession: defineMutation<[string, string]>(ctx, {
      check: (c, [userId, generatorId]) =>
        c.checks.sessions.startSession({ userId, generatorId }),
      apply: async ({ ctx: c, db, args: [userId, generatorId] }) => {
        await db.insert(generatorSessions).values({
          id: c.newId(),
          generatorId,
          startedByUserId: userId,
          stoppedByUserId: null,
          startedAt: c.now().toISOString(),
          stoppedAt: null
        })
      }
    }),

    deleteSession: defineMutation<[string, string]>(ctx, {
      check: (c, [userId, sessionId]) =>
        c.checks.sessions.deleteSession({ userId, sessionId }),
      apply: async ({ db, args: [, sessionId] }) => {
        await db
          .delete(generatorSessions)
          .where(eq(generatorSessions.id, sessionId))
      }
    }),

    stopSession: defineMutation<[string, string]>(ctx, {
      check: (c, [userId, sessionId]) =>
        c.checks.sessions.stopSession({ userId, sessionId }),
      apply: async ({ ctx: c, db, args: [userId, sessionId] }) => {
        await db
          .update(generatorSessions)
          .set({
            stoppedAt: c.now().toISOString(),
            stoppedByUserId: userId
          })
          .where(eq(generatorSessions.id, sessionId))
      }
    }),

    updateSession: defineMutation<
      [string, string, { startedAt: string; stoppedAt: string }]
    >(ctx, {
      check: (c, [userId, sessionId, input]) =>
        c.checks.sessions.updateSession({
          userId,
          sessionId,
          startedAt: input.startedAt,
          stoppedAt: input.stoppedAt,
          now: c.now()
        }),
      apply: async ({ db, args: [, sessionId, input] }) => {
        await db
          .update(generatorSessions)
          .set({
            startedAt: input.startedAt,
            stoppedAt: input.stoppedAt
          })
          .where(eq(generatorSessions.id, sessionId))
      }
    }),

    logManualSession: defineMutation<
      [string, { generatorId: string; startedAt: string; stoppedAt: string }]
    >(ctx, {
      check: (c, [userId, input]) =>
        c.checks.sessions.logManualSession({
          userId,
          generatorId: input.generatorId,
          startedAt: input.startedAt,
          stoppedAt: input.stoppedAt,
          now: c.now()
        }),
      apply: async ({ ctx: c, db, args: [userId, input] }) => {
        await db.insert(generatorSessions).values({
          id: c.newId(),
          generatorId: input.generatorId,
          startedByUserId: userId,
          stoppedByUserId: userId,
          startedAt: input.startedAt,
          stoppedAt: input.stoppedAt
        })
      }
    })
  }
}
