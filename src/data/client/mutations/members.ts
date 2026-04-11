import { and, eq } from 'drizzle-orm'

import { generators, generatorUserAssignments } from '@/data/client/db-schema'
import { memberLifecycleChecks } from '@/data/client/members'
import type { MemberRef } from '@/data/shared/members'
import { db, powersync } from '@/lib/powersync/database'

import { fail, newId, nowISO, ok, type MutationResult } from './helpers'

/**
 * Transfer every generator assignment the departing member has in the org
 * to the org admin, then delete the membership row. Shared between
 * removeMember (admin-initiated) and leaveOrganization (self-initiated) —
 * per spec §4.5, both entry points must leave open sessions open and
 * reassign orphaned generators to the admin. Rules live in
 * `shared/members/policy.ts`; this helper only handles the SQLite I/O.
 */
async function transferAssignmentsAndRemove(
  member: MemberRef,
  adminUserId: string
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
        eq(generatorUserAssignments.userId, member.userId),
        eq(generators.organizationId, member.organizationId)
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
      member.id
    ])
  })
}

export async function removeMember(
  adminUserId: string,
  memberId: string
): Promise<MutationResult> {
  const check = await memberLifecycleChecks.removeMember(adminUserId, memberId)
  if (!check.ok) return fail(check.code)
  await transferAssignmentsAndRemove(check.member, check.adminUserId)
  return ok
}

export async function leaveOrganization(
  userId: string,
  orgId: string
): Promise<MutationResult> {
  const check = await memberLifecycleChecks.leaveOrganization(userId, orgId)
  if (!check.ok) return fail(check.code)
  await transferAssignmentsAndRemove(check.member, check.adminUserId)
  return ok
}
