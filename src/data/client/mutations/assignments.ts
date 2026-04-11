import { and, eq } from 'drizzle-orm'

import { generatorUserAssignments } from '@/data/client/db-schema'
import { fail, ok, type MutationResult } from '@/data/shared/result'

import type { MutationContext } from './context'

export function createAssignmentMutations(ctx: MutationContext) {
  return {
    async assignUserToGenerator(
      adminUserId: string,
      generatorId: string,
      targetUserId: string
    ): Promise<MutationResult> {
      const result = await ctx.checks.assignments.assignUserToGenerator(
        adminUserId,
        generatorId,
        targetUserId
      )
      if (!result.ok) return fail(result.code)

      await ctx.db.insert(generatorUserAssignments).values({
        id: ctx.newId(),
        generatorId,
        userId: targetUserId,
        assignedAt: ctx.now().toISOString()
      })

      return ok
    },

    async unassignUserFromGenerator(
      adminUserId: string,
      generatorId: string,
      targetUserId: string
    ): Promise<MutationResult> {
      const result = await ctx.checks.assignments.unassignUserFromGenerator(
        adminUserId,
        generatorId,
        targetUserId
      )
      if (!result.ok) return fail(result.code)

      await ctx.db
        .delete(generatorUserAssignments)
        .where(
          and(
            eq(generatorUserAssignments.generatorId, generatorId),
            eq(generatorUserAssignments.userId, targetUserId)
          )
        )

      return ok
    }
  }
}
