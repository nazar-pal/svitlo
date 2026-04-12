// Spec §4.5: assignments must transfer to admin before membership deletion.
import type { MemberRef } from './facts'

export interface MemberWritePort {
  listAssignmentsForMemberInOrg(
    userId: string,
    organizationId: string
  ): Promise<readonly { generatorId: string }[]>

  reassignGeneratorAssignment(params: {
    generatorId: string
    fromUserId: string
    toUserId: string
    assignedAt: Date
  }): Promise<void>

  deleteMembership(membershipId: string): Promise<void>
}

export async function transferAssignmentsAndRemoveMember(
  port: MemberWritePort,
  params: {
    member: MemberRef
    adminUserId: string
    now: Date
  }
): Promise<void> {
  const assignments = await port.listAssignmentsForMemberInOrg(
    params.member.userId,
    params.member.organizationId
  )

  for (const a of assignments) {
    await port.reassignGeneratorAssignment({
      generatorId: a.generatorId,
      fromUserId: params.member.userId,
      toUserId: params.adminUserId,
      assignedAt: params.now
    })
  }

  await port.deleteMembership(params.member.id)
}
