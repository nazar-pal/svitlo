import { eq } from 'drizzle-orm'

import { isOrgAdmin } from '@/data/client/authz'
import { generatorUserAssignments } from '@/data/client/db-schema'
import {
  getAssignmentForUserAndGenerator,
  getGeneratorOrgId,
  getOrgMemberById
} from '@/data/client/queries'
import { db } from '@/lib/powersync/database'

import { fail, newId, nowISO, ok, type MutationResult } from './helpers'

export async function assignUserToGenerator(
  adminUserId: string,
  generatorId: string,
  targetUserId: string
): Promise<MutationResult> {
  const orgId = await getGeneratorOrgId(generatorId)
  if (!orgId) return fail('GENERATOR_NOT_FOUND')

  if (!(await isOrgAdmin(adminUserId, orgId)))
    return fail('ONLY_ADMIN_CAN_ASSIGN_USERS')

  // Check target is a member of the org (not needed for admin)
  if (targetUserId !== adminUserId) {
    const member = await getOrgMemberById(targetUserId, orgId)
    if (!member) return fail('USER_NOT_ORG_MEMBER')
  }

  const existing = await getAssignmentForUserAndGenerator(
    targetUserId,
    generatorId
  )
  if (existing) return fail('USER_ALREADY_ASSIGNED')

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
  const orgId = await getGeneratorOrgId(generatorId)
  if (!orgId) return fail('GENERATOR_NOT_FOUND')

  if (!(await isOrgAdmin(adminUserId, orgId)))
    return fail('ONLY_ADMIN_CAN_UNASSIGN_USERS')

  const assignment = await getAssignmentForUserAndGenerator(
    targetUserId,
    generatorId
  )
  if (!assignment) return fail('USER_NOT_ASSIGNED')

  await db
    .delete(generatorUserAssignments)
    .where(eq(generatorUserAssignments.id, assignment.id))

  return ok
}
