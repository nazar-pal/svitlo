import { and, eq } from 'drizzle-orm'

import {
  generators,
  generatorUserAssignments,
  organizationMembers
} from '@/data/client/db-schema'
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

  // Wrap all mutations in a transaction for atomicity
  await powersync.writeTransaction(async tx => {
    for (const a of assignments) {
      // Delete the member's assignment
      await tx.execute('DELETE FROM generator_user_assignments WHERE id = ?', [
        a.assignmentId
      ])

      // Check if admin is already assigned
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

    // Delete the member
    await tx.execute('DELETE FROM organization_members WHERE id = ?', [
      memberId
    ])
  })

  return ok
}
