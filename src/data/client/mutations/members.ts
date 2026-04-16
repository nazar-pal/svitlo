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
import type { ClientDb } from '@/lib/powersync/database'

import type { MutationContext } from './context'
import { defineMutation } from './pipeline'

type MemberLifecycleCheck =
  | { ok: true; member: MemberRef; adminUserId: string; facts: unknown }
  | { ok: false; code: string }

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
  return {
    removeMember: defineMutation<
      [string, string],
      undefined,
      MemberLifecycleCheck
    >(ctx, {
      check: (c, [callerUserId, memberId]) =>
        c.checks.members.removeMember({ callerUserId, memberId }),
      tx: true,
      apply: async ({ ctx: c, db, checkOk }) => {
        await transferAssignmentsAndRemoveMember(
          createClientMemberWritePort(db, c),
          {
            member: checkOk.member,
            adminUserId: checkOk.adminUserId,
            now: c.now()
          }
        )
      }
    }),

    leaveOrganization: defineMutation<
      [string, string],
      undefined,
      MemberLifecycleCheck
    >(ctx, {
      check: (c, [userId, organizationId]) =>
        c.checks.members.leaveOrganization({ userId, organizationId }),
      tx: true,
      apply: async ({ ctx: c, db, checkOk }) => {
        await transferAssignmentsAndRemoveMember(
          createClientMemberWritePort(db, c),
          {
            member: checkOk.member,
            adminUserId: checkOk.adminUserId,
            now: c.now()
          }
        )
      }
    })
  }
}
