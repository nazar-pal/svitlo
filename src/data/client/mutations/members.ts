import { and, eq } from 'drizzle-orm'

import {
  generators,
  generatorUserAssignments,
  organizationMembers
} from '@/data/client/db-schema'
import { db } from '@/lib/powersync/database'

import {
  fail,
  isOrgAdmin,
  newId,
  nowISO,
  ok,
  type MutationResult
} from './helpers'

/**
 * Remove a member from an organization.
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
  // Find the member
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.id, memberId))
    .limit(1)

  if (!member) return fail('Member not found')

  if (!(await isOrgAdmin(adminUserId, member.organizationId)))
    return fail('Only admin can remove members')

  // Find all generator assignments for this member within the org
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
        eq(generatorUserAssignments.userId, member.userId),
        eq(generators.organizationId, member.organizationId)
      )
    )

  // Transfer each assignment to the admin
  for (const a of assignments) {
    // Delete the member's assignment
    await db
      .delete(generatorUserAssignments)
      .where(eq(generatorUserAssignments.id, a.assignmentId))

    // Check if admin is already assigned
    const [existing] = await db
      .select({ id: generatorUserAssignments.id })
      .from(generatorUserAssignments)
      .where(
        and(
          eq(generatorUserAssignments.generatorId, a.generatorId),
          eq(generatorUserAssignments.userId, adminUserId)
        )
      )
      .limit(1)

    if (!existing) {
      await db.insert(generatorUserAssignments).values({
        id: newId(),
        generatorId: a.generatorId,
        userId: adminUserId,
        assignedAt: nowISO()
      })
    }
  }

  // Delete the member
  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.id, memberId))

  return ok
}
