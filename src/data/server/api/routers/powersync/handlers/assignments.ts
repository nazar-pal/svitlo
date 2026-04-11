import { eq } from 'drizzle-orm'

import { generatorUserAssignments } from '@/data/server/db-schema'
import { createServerAssignmentChecks } from '@/data/server/assignments'

import { replayShieldAlreadyExists, replayShieldNotFound } from './replay'
import { transformSyncData } from '../transform'
import { fail, ok, type Insert, type TableHandler } from './types'

export const handleGeneratorUserAssignments: TableHandler = async ctx => {
  const { db, userId, op, id, data } = ctx
  const checks = createServerAssignmentChecks(db)

  if (op === 'insert') {
    const values =
      transformSyncData<Insert<typeof generatorUserAssignments>>(data)
    const generatorId = values.generatorId as string
    const targetUserId = (values.userId as string | undefined) ?? userId

    const shielded = replayShieldAlreadyExists(
      await checks.assignUserToGenerator(userId, generatorId, targetUserId),
      'USER_ALREADY_ASSIGNED'
    )
    if (shielded.status === 'consume') return shielded.result

    await db
      .insert(generatorUserAssignments)
      .values({ ...values, id })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'delete') {
    // Lookup the row up front so we can pass the target user id to the
    // shared check. The shared policy works in (caller, generator, target)
    // terms, but the server's delete wire shape only carries the assignment
    // row id — hence the one-off fetch. If the row is already gone, return
    // ok so the sync queue advances past the already-applied delete.
    const assignment = await db.query.generatorUserAssignments.findFirst({
      where: eq(generatorUserAssignments.id, id),
      columns: { generatorId: true, userId: true }
    })
    if (!assignment) return ok

    const shielded = replayShieldNotFound(
      await checks.unassignUserFromGenerator(
        userId,
        assignment.generatorId,
        assignment.userId
      ),
      'USER_NOT_ASSIGNED'
    )
    if (shielded.status === 'consume') return shielded.result

    await db
      .delete(generatorUserAssignments)
      .where(eq(generatorUserAssignments.id, id))
    return ok
  }

  return fail('Invalid operation on generator_user_assignments')
}
