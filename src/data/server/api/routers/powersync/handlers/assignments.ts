import { eq } from 'drizzle-orm'

import { generatorUserAssignments } from '@/data/server/db-schema'

import { defineTableHandler } from './pipeline'
import type { Insert } from './types'

export const handleGeneratorUserAssignments = defineTableHandler({
  table: 'generator_user_assignments',
  insert: {
    check: ({ userId, checks }, parsed) => {
      const values = parsed as Insert<typeof generatorUserAssignments>
      const generatorId = values.generatorId as string
      const targetUserId = (values.userId as string | undefined) ?? userId
      return checks.assignments.assignUserToGenerator(
        userId,
        generatorId,
        targetUserId
      )
    },
    shield: { kind: 'alreadyExists', code: 'USER_ALREADY_ASSIGNED' },
    apply: async ({ db, id }, parsed) => {
      const values = parsed as Insert<typeof generatorUserAssignments>
      await db
        .insert(generatorUserAssignments)
        .values({ ...values, id })
        .onConflictDoNothing()
    }
  },
  delete: {
    // The shared policy works in (caller, generator, target) terms, but the
    // wire shape of a delete only carries the assignment row id — fetch the
    // row inside `check` to extract the target. A missing row is folded into
    // the same `USER_NOT_ASSIGNED` code that the shield consumes, so a replay
    // against an already-applied delete advances the sync queue silently.
    check: async ({ db, userId, id, checks }) => {
      const assignment = await db.query.generatorUserAssignments.findFirst({
        where: eq(generatorUserAssignments.id, id),
        columns: { generatorId: true, userId: true }
      })
      if (!assignment) return { ok: false, code: 'USER_NOT_ASSIGNED' } as const
      return checks.assignments.unassignUserFromGenerator(
        userId,
        assignment.generatorId,
        assignment.userId
      )
    },
    shield: { kind: 'notFound', code: 'USER_NOT_ASSIGNED' },
    apply: async ({ db, id }) => {
      await db
        .delete(generatorUserAssignments)
        .where(eq(generatorUserAssignments.id, id))
    }
  }
})
