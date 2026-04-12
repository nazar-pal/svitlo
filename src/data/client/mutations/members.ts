import { and, eq } from 'drizzle-orm'

import {
  generators,
  generatorUserAssignments,
  organizationMembers
} from '@/data/client/db-schema'
import {
  transferAssignmentsAndRemoveMember,
  type MemberRef,
  type MemberWritePort
} from '@/data/shared/members'
import { fail, ok, type MutationResult } from '@/data/shared/result'

import type { ClientDb } from '@/lib/powersync/database'

import type { MutationContext } from './context'

function createClientMemberWritePort(
  tx: ClientDb,
  ctx: Pick<MutationContext, 'newId'>
): MemberWritePort {
  return {
    async listAssignmentsForMemberInOrg(userId, organizationId) {
      return tx
        .select({ generatorId: generatorUserAssignments.generatorId })
        .from(generatorUserAssignments)
        .innerJoin(
          generators,
          eq(generatorUserAssignments.generatorId, generators.id)
        )
        .where(
          and(
            eq(generatorUserAssignments.userId, userId),
            eq(generators.organizationId, organizationId)
          )
        )
    },
    async reassignGeneratorAssignment({
      generatorId,
      fromUserId,
      toUserId,
      assignedAt
    }) {
      await tx
        .delete(generatorUserAssignments)
        .where(
          and(
            eq(generatorUserAssignments.generatorId, generatorId),
            eq(generatorUserAssignments.userId, fromUserId)
          )
        )

      const existing = await tx
        .select({ id: generatorUserAssignments.id })
        .from(generatorUserAssignments)
        .where(
          and(
            eq(generatorUserAssignments.generatorId, generatorId),
            eq(generatorUserAssignments.userId, toUserId)
          )
        )
        .limit(1)
        .get()

      if (!existing) {
        await tx.insert(generatorUserAssignments).values({
          id: ctx.newId(),
          generatorId,
          userId: toUserId,
          assignedAt: assignedAt.toISOString()
        })
      }
    },
    async deleteMembership(membershipId) {
      await tx
        .delete(organizationMembers)
        .where(eq(organizationMembers.id, membershipId))
    }
  }
}

export function createMemberMutations(ctx: MutationContext) {
  async function runRemoval(member: MemberRef, adminUserId: string) {
    await ctx.writeTx(async tx => {
      await transferAssignmentsAndRemoveMember(
        createClientMemberWritePort(tx, ctx),
        { member, adminUserId, now: ctx.now() }
      )
    })
  }

  return {
    async removeMember(
      adminUserId: string,
      memberId: string
    ): Promise<MutationResult> {
      const check = await ctx.checks.members.removeMember(adminUserId, memberId)
      if (!check.ok) return fail(check.code)
      await runRemoval(check.member, check.adminUserId)
      return ok
    },

    async leaveOrganization(
      userId: string,
      orgId: string
    ): Promise<MutationResult> {
      const check = await ctx.checks.members.leaveOrganization(userId, orgId)
      if (!check.ok) return fail(check.code)
      await runRemoval(check.member, check.adminUserId)
      return ok
    }
  }
}
