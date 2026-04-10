import { eq } from 'drizzle-orm'

import { isOrgAdmin } from '@/data/client/authz'
import { generatorUserAssignments } from '@/data/client/db-schema'
import {
  getAssignmentForUserAndGenerator,
  getGeneratorOrgId,
  getOrgMemberById
} from '@/data/client/queries'
import { t } from '@/lib/i18n'
import { db } from '@/lib/powersync/database'

import { fail, newId, nowISO, ok, type MutationResult } from './helpers'

export async function assignUserToGenerator(
  adminUserId: string,
  generatorId: string,
  targetUserId: string
): Promise<MutationResult> {
  const orgId = await getGeneratorOrgId(generatorId)
  if (!orgId) return fail(t('errors.generatorNotFound'))

  if (!(await isOrgAdmin(adminUserId, orgId)))
    return fail(t('errors.onlyAdminCanAssignUsers'))

  // Check target is a member of the org (not needed for admin)
  if (targetUserId !== adminUserId) {
    const member = await getOrgMemberById(targetUserId, orgId)
    if (!member) return fail(t('errors.userNotOrgMember'))
  }

  const existing = await getAssignmentForUserAndGenerator(
    targetUserId,
    generatorId
  )
  if (existing) return fail(t('errors.userAlreadyAssigned'))

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
  if (!orgId) return fail(t('errors.generatorNotFound'))

  if (!(await isOrgAdmin(adminUserId, orgId)))
    return fail(t('errors.onlyAdminCanUnassignUsers'))

  const assignment = await getAssignmentForUserAndGenerator(
    targetUserId,
    generatorId
  )
  if (!assignment) return fail(t('errors.userNotAssigned'))

  await db
    .delete(generatorUserAssignments)
    .where(eq(generatorUserAssignments.id, assignment.id))

  return ok
}
