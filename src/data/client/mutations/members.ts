import { and, eq } from 'drizzle-orm'

import {
  generators,
  generatorUserAssignments,
  organizationMembers,
  organizations
} from '@/data/client/db-schema'
import { t } from '@/lib/i18n'
import { db, powersync } from '@/lib/powersync/database'

import {
  fail,
  isOrgAdmin,
  newId,
  nowISO,
  ok,
  type MutationResult
} from './helpers'

/**
 * Reassign all of a member's generators to the admin and delete the membership.
 *
 * Shared by removeMember (admin-initiated) and leaveOrganization (self-initiated).
 */
async function reassignAndRemoveMember(
  userId: string,
  orgId: string,
  adminUserId: string,
  memberId: string
) {
  const assignments = await db
    .select({
      assignmentId: generatorUserAssignments.id,
      generatorId: generatorUserAssignments.generatorId
    })
    .from(generatorUserAssignments)
    .innerJoin(
      generators,
      eq(generatorUserAssignments.generatorId, generators.id)
    )
    .where(
      and(
        eq(generatorUserAssignments.userId, userId),
        eq(generators.organizationId, orgId)
      )
    )

  await powersync.writeTransaction(async tx => {
    for (const a of assignments) {
      await tx.execute('DELETE FROM generator_user_assignments WHERE id = ?', [
        a.assignmentId
      ])

      const existing = await tx.getOptional(
        'SELECT id FROM generator_user_assignments WHERE generator_id = ? AND user_id = ? LIMIT 1',
        [a.generatorId, adminUserId]
      )

      if (!existing) {
        await tx.execute(
          'INSERT INTO generator_user_assignments (id, generator_id, user_id, assigned_at) VALUES (?, ?, ?, ?)',
          [newId(), a.generatorId, adminUserId, nowISO()]
        )
      }
    }

    await tx.execute('DELETE FROM organization_members WHERE id = ?', [
      memberId
    ])
  })
}

/**
 * Remove a member from an organization (admin only).
 *
 * Per spec §4.5:
 * - All generator assignments for the removed member within the org are deleted
 * - Each generator the employee was assigned to is automatically assigned to the admin
 * - Open sessions started by the removed employee remain open
 */
export async function removeMember(
  adminUserId: string,
  memberId: string
): Promise<MutationResult> {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.id, memberId))
    .limit(1)

  if (!member) return fail(t('errors.memberNotFound'))

  if (!(await isOrgAdmin(adminUserId, member.organizationId)))
    return fail(t('errors.onlyAdminCanRemoveMembers'))

  await reassignAndRemoveMember(
    member.userId,
    member.organizationId,
    adminUserId,
    memberId
  )

  return ok
}

/**
 * Leave an organization voluntarily (employee only).
 *
 * Same cleanup as removeMember:
 * - All generator assignments for the leaving member within the org are deleted
 * - Each generator the employee was assigned to is automatically assigned to the admin
 * - Open sessions started by the leaving employee remain open
 */
export async function leaveOrganization(
  userId: string,
  orgId: string
): Promise<MutationResult> {
  if (await isOrgAdmin(userId, orgId)) return fail(t('errors.adminCannotLeave'))

  const [member] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, orgId)
      )
    )
    .limit(1)

  if (!member) return fail(t('errors.notMemberOfOrg'))

  const [org] = await db
    .select({ adminUserId: organizations.adminUserId })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)

  if (!org) return fail(t('errors.organizationNotFound'))

  await reassignAndRemoveMember(userId, orgId, org.adminUserId, member.id)

  return ok
}
