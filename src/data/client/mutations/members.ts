import { and, eq } from 'drizzle-orm'

import {
  generators,
  generatorUserAssignments,
  organizationMembers
} from '@/data/client/db-schema'
import type { MemberRef } from '@/data/shared/members'
import { fail, ok, type MutationResult } from '@/data/shared/result'

import type { MutationContext } from './context'

export function createMemberMutations(ctx: MutationContext) {
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
    const assignments = await ctx.db
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

    await ctx.writeTx(async tx => {
      for (const a of assignments) {
        await tx
          .delete(generatorUserAssignments)
          .where(eq(generatorUserAssignments.id, a.assignmentId))

        const existing = await tx
          .select({ id: generatorUserAssignments.id })
          .from(generatorUserAssignments)
          .where(
            and(
              eq(generatorUserAssignments.generatorId, a.generatorId),
              eq(generatorUserAssignments.userId, adminUserId)
            )
          )
          .limit(1)
          .get()

        if (!existing) {
          await tx.insert(generatorUserAssignments).values({
            id: ctx.newId(),
            generatorId: a.generatorId,
            userId: adminUserId,
            assignedAt: ctx.now().toISOString()
          })
        }
      }

      await tx
        .delete(organizationMembers)
        .where(eq(organizationMembers.id, member.id))
    })
  }

  return {
    async removeMember(
      adminUserId: string,
      memberId: string
    ): Promise<MutationResult> {
      const check = await ctx.checks.members.removeMember(adminUserId, memberId)
      if (!check.ok) return fail(check.code)
      await transferAssignmentsAndRemove(check.member, check.adminUserId)
      return ok
    },

    async leaveOrganization(
      userId: string,
      orgId: string
    ): Promise<MutationResult> {
      const check = await ctx.checks.members.leaveOrganization(userId, orgId)
      if (!check.ok) return fail(check.code)
      await transferAssignmentsAndRemove(check.member, check.adminUserId)
      return ok
    }
  }
}
