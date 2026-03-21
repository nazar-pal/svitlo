import { and, eq } from 'drizzle-orm'

import {
  generatorUserAssignments,
  organizationMembers
} from '@/data/client/db-schema'
import { t } from '@/lib/i18n'
import { db } from '@/lib/powersync/database'

import {
  fail,
  getGeneratorOrg,
  isOrgAdmin,
  newId,
  nowISO,
  ok,
  type MutationResult
} from './helpers'

export async function assignUserToGenerator(
  adminUserId: string,
  generatorId: string,
  targetUserId: string
): Promise<MutationResult> {
  const gen = await getGeneratorOrg(generatorId)
  if (!gen) return fail(t('errors.generatorNotFound'))

  if (!(await isOrgAdmin(adminUserId, gen.organizationId)))
    return fail(t('errors.onlyAdminCanAssignUsers'))

  // Check target is a member of the org (not needed for admin)
  if (targetUserId !== adminUserId) {
    const [member] = await db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, gen.organizationId),
          eq(organizationMembers.userId, targetUserId)
        )
      )
      .limit(1)

    if (!member) return fail(t('errors.userNotOrgMember'))
  }

  // Check not already assigned
  const [existing] = await db
    .select({ id: generatorUserAssignments.id })
    .from(generatorUserAssignments)
    .where(
      and(
        eq(generatorUserAssignments.generatorId, generatorId),
        eq(generatorUserAssignments.userId, targetUserId)
      )
    )
    .limit(1)

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
  const gen = await getGeneratorOrg(generatorId)
  if (!gen) return fail(t('errors.generatorNotFound'))

  if (!(await isOrgAdmin(adminUserId, gen.organizationId)))
    return fail(t('errors.onlyAdminCanUnassignUsers'))

  const [assignment] = await db
    .select({ id: generatorUserAssignments.id })
    .from(generatorUserAssignments)
    .where(
      and(
        eq(generatorUserAssignments.generatorId, generatorId),
        eq(generatorUserAssignments.userId, targetUserId)
      )
    )
    .limit(1)

  if (!assignment) return fail(t('errors.userNotAssigned'))

  await db
    .delete(generatorUserAssignments)
    .where(eq(generatorUserAssignments.id, assignment.id))

  return ok
}
