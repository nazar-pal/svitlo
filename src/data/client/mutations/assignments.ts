import { and, eq } from 'drizzle-orm'

import { generatorUserAssignments } from '@/data/client/db-schema'

import type { MutationContext } from './context'
import { defineMutation } from './pipeline'

export function createAssignmentMutations(ctx: MutationContext) {
  return {
    assignUserToGenerator: defineMutation<[string, string, string]>(ctx, {
      check: (c, [callerUserId, generatorId, targetUserId]) =>
        c.checks.assignments.assignUserToGenerator({
          callerUserId,
          generatorId,
          targetUserId
        }),
      apply: async ({ ctx: c, db, args: [, generatorId, targetUserId] }) => {
        await db.insert(generatorUserAssignments).values({
          id: c.newId(),
          generatorId,
          userId: targetUserId,
          assignedAt: c.now().toISOString()
        })
      }
    }),

    unassignUserFromGenerator: defineMutation<[string, string, string]>(ctx, {
      check: (c, [callerUserId, generatorId, targetUserId]) =>
        c.checks.assignments.unassignUserFromGenerator({
          callerUserId,
          generatorId,
          targetUserId
        }),
      apply: async ({ db, args: [, generatorId, targetUserId] }) => {
        await db
          .delete(generatorUserAssignments)
          .where(
            and(
              eq(generatorUserAssignments.generatorId, generatorId),
              eq(generatorUserAssignments.userId, targetUserId)
            )
          )
      }
    })
  }
}
