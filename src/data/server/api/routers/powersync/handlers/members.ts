import { and, eq, sql } from 'drizzle-orm'

import {
  generatorUserAssignments,
  generators,
  invitations,
  organizationMembers
} from '@/data/server/db-schema'
import { serverLookup } from '@/data/server/registry'
import * as authz from '@/data/shared/authz/decisions'
import { runDecisionAsync } from '@/data/shared/facts/async-adapter'
import {
  transferAssignmentsAndRemoveMember,
  type MemberWritePort
} from '@/data/shared/members'

import { replayShieldNotFound } from './replay'
import { transformSyncRow } from '../transform'
import { fail, ok, type Db, type Insert, type TableHandler } from './types'

function createServerMemberWritePort(db: Db): MemberWritePort {
  return {
    async listAssignmentsForMemberInOrg(userId, organizationId) {
      return db
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
      await db
        .delete(generatorUserAssignments)
        .where(
          and(
            eq(generatorUserAssignments.generatorId, generatorId),
            eq(generatorUserAssignments.userId, fromUserId)
          )
        )
      await db
        .insert(generatorUserAssignments)
        .values({ generatorId, userId: toUserId, assignedAt })
        .onConflictDoNothing()
    },
    async deleteMembership(membershipId) {
      await db
        .delete(organizationMembers)
        .where(eq(organizationMembers.id, membershipId))
    }
  }
}

export const handleOrganizationMembers: TableHandler = async ctx => {
  const { db, userId, userEmail, op, id, data } = ctx

  if (op === 'insert') {
    const values = transformSyncRow(organizationMembers, data)
    const orgId = values.organizationId as string
    const memberUserId = values.userId as string

    const adminCheck = await runDecisionAsync(
      authz.isOrgAdmin,
      { userId, orgId },
      serverLookup(db)
    )
    if (adminCheck.ok) {
      await db
        .insert(organizationMembers)
        .values({ ...values, id } as Insert<typeof organizationMembers>)
        .onConflictDoNothing()
      return ok
    }

    if (memberUserId === userId) {
      const invitation = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.organizationId, orgId),
          eq(sql`LOWER(${invitations.inviteeEmail})`, userEmail.toLowerCase())
        ),
        columns: { id: true }
      })
      if (!invitation)
        return fail('No pending invitation for this organization')

      await db
        .insert(organizationMembers)
        .values({ ...values, id } as Insert<typeof organizationMembers>)
        .onConflictDoNothing()
      await db.delete(invitations).where(eq(invitations.id, invitation.id))
      return ok
    }

    return fail('Not authorized to add members')
  }

  if (op === 'delete') {
    const checks = ctx.checks.members
    const port = createServerMemberWritePort(db)

    // Try the admin-removes-member path first. If the caller is the org
    // admin, this resolves straight away with the member + adminUserId the
    // side effect needs.
    const remove = replayShieldNotFound(
      await checks.removeMember({ callerUserId: userId, memberId: id }),
      'MEMBER_NOT_FOUND'
    )
    if (remove.status === 'ok') {
      await transferAssignmentsAndRemoveMember(port, {
        member: remove.data.member,
        adminUserId: remove.data.adminUserId,
        now: ctx.now()
      })
      return ok
    }
    // Replay path: row already gone, sync queue should advance silently.
    if (remove.result.ok) return remove.result

    // Not authorized as admin. Fall back to the self-leave path. We need
    // the organization id for `leaveOrganization`; fetch the member row
    // directly here because `removeMember` doesn't expose it on failure.
    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, id),
      columns: { organizationId: true, userId: true }
    })
    if (!member) return ok
    if (member.userId !== userId) return remove.result

    const leave = await checks.leaveOrganization({
      userId,
      organizationId: member.organizationId
    })
    if (!leave.ok) return fail(leave.code)
    await transferAssignmentsAndRemoveMember(port, {
      member: leave.member,
      adminUserId: leave.adminUserId,
      now: ctx.now()
    })
    return ok
  }

  return fail('Invalid operation on organization_members')
}
