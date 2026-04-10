import { and, eq } from 'drizzle-orm'

import { isOrgAdmin } from '@/data/client/authz'
import { generators, generatorUserAssignments } from '@/data/client/db-schema'
import {
  getOrganizationAdminUserId,
  getOrgMemberById,
  getOrgMembershipById
} from '@/data/client/queries'
import { db, powersync } from '@/lib/powersync/database'

import { fail, newId, nowISO, ok, type MutationResult } from './helpers'

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
  const member = await getOrgMembershipById(memberId)
  if (!member) return fail('MEMBER_NOT_FOUND')

  if (!(await isOrgAdmin(adminUserId, member.organizationId)))
    return fail('ONLY_ADMIN_CAN_REMOVE_MEMBERS')

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
  if (await isOrgAdmin(userId, orgId)) return fail('ADMIN_CANNOT_LEAVE')

  const member = await getOrgMemberById(userId, orgId)
  if (!member) return fail('NOT_MEMBER_OF_ORG')

  const adminUserId = await getOrganizationAdminUserId(orgId)
  if (!adminUserId) return fail('ORGANIZATION_NOT_FOUND')

  await reassignAndRemoveMember(userId, orgId, adminUserId, member.id)

  return ok
}
