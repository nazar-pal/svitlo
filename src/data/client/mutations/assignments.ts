import { and, eq } from 'drizzle-orm'

import { generatorUserAssignments } from '@/data/client/db-schema'

import type { MutationContext } from './context'
import { defineMutation } from './pipeline'

export function createAssignmentMutations(ctx: MutationContext) {
  return {
    assignUserToGenerator: defineMutation<[string, string, string]>(ctx, {
      check: (c, [adminUserId, generatorId, targetUserId]) =>
        c.checks.assignments.assignUserToGenerator(
          adminUserId,
          generatorId,
          targetUserId
        ),
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
      check: (c, [adminUserId, generatorId, targetUserId]) =>
        c.checks.assignments.unassignUserFromGenerator(
          adminUserId,
          generatorId,
          targetUserId
        ),
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
