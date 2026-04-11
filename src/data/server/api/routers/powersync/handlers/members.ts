import { and, eq, sql } from 'drizzle-orm'

import {
  generatorUserAssignments,
  generators,
  invitations,
  organizationMembers
} from '@/data/server/db-schema'
import { createServerAuthz } from '@/data/server/authz'
import { createServerMemberChecks } from '@/data/server/members'
import type { MemberRef } from '@/data/shared/members'

import { replayShieldNotFound } from './replay'
import { transformSyncData } from '../transform'
import { fail, ok, type Db, type Insert, type TableHandler } from './types'

/**
 * Transfer a departing member's generator assignments to the org admin,
 * then delete the membership. The caller supplies the resolved `MemberRef`
 * from the shared policy result, so this Postgres dialect of the side
 * effect doesn't need a second `findMembership` round trip.
 */
async function transferAssignmentsAndRemoveMember(
  db: Db,
  adminUserId: string,
  member: MemberRef
) {
  const assignments = await db
    .select({ generatorId: generatorUserAssignments.generatorId })
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

  for (const a of assignments) {
    await db
      .delete(generatorUserAssignments)
      .where(
        and(
          eq(generatorUserAssignments.generatorId, a.generatorId),
          eq(generatorUserAssignments.userId, member.userId)
        )
      )

    await db
      .insert(generatorUserAssignments)
      .values({
        generatorId: a.generatorId,
        userId: adminUserId,
        assignedAt: new Date()
      })
      .onConflictDoNothing()
  }

  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.id, member.id))
}

export const handleOrganizationMembers: TableHandler = async ctx => {
  const { db, userId, userEmail, op, id, data } = ctx
  const authz = createServerAuthz(db)

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof organizationMembers>>(data)
    const orgId = values.organizationId as string
    const memberUserId = values.userId as string

    if (await authz.isOrgAdmin(userId, orgId)) {
      await db
        .insert(organizationMembers)
        .values({ ...values, id })
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
        .values({ ...values, id })
        .onConflictDoNothing()
      await db.delete(invitations).where(eq(invitations.id, invitation.id))
      return ok
    }

    return fail('Not authorized to add members')
  }

  if (op === 'delete') {
    const checks = createServerMemberChecks(db)

    // Try the admin-removes-member path first. If the caller is the org
    // admin, this resolves straight away with the member + adminUserId the
    // side effect needs.
    const remove = replayShieldNotFound(
      await checks.removeMember(userId, id),
      'MEMBER_NOT_FOUND'
    )
    if (remove.status === 'ok') {
      await transferAssignmentsAndRemoveMember(
        db,
        remove.data.adminUserId,
        remove.data.member
      )
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

    const leave = await checks.leaveOrganization(userId, member.organizationId)
    if (!leave.ok) return fail(leave.code)
    await transferAssignmentsAndRemoveMember(
      db,
      leave.adminUserId,
      leave.member
    )
    return ok
  }

  return fail('Invalid operation on organization_members')
}
