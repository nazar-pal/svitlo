import { and, eq } from 'drizzle-orm'

import { assignmentLifecycleChecks } from '@/data/client/assignments'
import { generatorUserAssignments } from '@/data/client/db-schema'
import { db } from '@/lib/powersync/database'

import { fail, newId, nowISO, ok, type MutationResult } from './helpers'

export async function assignUserToGenerator(
  adminUserId: string,
  generatorId: string,
  targetUserId: string
): Promise<MutationResult> {
  const result = await assignmentLifecycleChecks.assignUserToGenerator(
    adminUserId,
    generatorId,
    targetUserId
  )
  if (!result.ok) return fail(result.code)

  await db.insert(generatorUserAssignments).values({
    id: newId(),
    generatorId,
    userId: targetUserId,
    assignedAt: nowISO()
  })

  return ok
}

export async function unassignUserFromGenerator(
  adminUserId: string,
  generatorId: string,
  targetUserId: string
): Promise<MutationResult> {
  const result = await assignmentLifecycleChecks.unassignUserFromGenerator(
    adminUserId,
    generatorId,
    targetUserId
  )
  if (!result.ok) return fail(result.code)

  await db
    .delete(generatorUserAssignments)
    .where(
      and(
        eq(generatorUserAssignments.generatorId, generatorId),
        eq(generatorUserAssignments.userId, targetUserId)
      )
    )

  return ok
}
