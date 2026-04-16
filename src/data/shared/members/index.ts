import type { ParamFreeMutationErrorCode } from '@/data/shared/errors'
import type { PolicyResult } from '@/data/shared/policy-result'

export type { PolicyResult }

// Fact shapes the member-lifecycle policy needs. `id` is the membership
// row id — both entry points (admin-removes and self-leaves) need it for
// the downstream transfer-and-delete side effect, so carrying it on
// MemberRef lets the policy result be a single shape.
export interface MemberRef {
  id: string
  organizationId: string
  userId: string
}

// Local `fail` helper so the return type narrows to the failure variant —
// `policyFail` returns the wider `PolicyResult`, which would let an
// ok-branch leak past the richer `MemberLifecycleResult` shape.
const fail = (
  code: ParamFreeMutationErrorCode
): { ok: false; code: ParamFreeMutationErrorCode } => ({ ok: false, code })

// Both lifecycle policies surface the resolved `member` + `adminUserId` on
// success so callers can drive `transferAssignmentsAndRemoveMember`
// without null-guarding the fact payload a second time. Follows the
// precedent set by `acceptInvitationPolicy` / `deleteOrganizationPolicy`.
export type MemberLifecycleResult =
  | { ok: true; member: MemberRef; adminUserId: string }
  | Exclude<PolicyResult, { ok: true }>

export const removeMemberPolicy = (facts: {
  member: MemberRef | null
  isCallerOrgAdmin: boolean
  adminUserId: string | null
}): MemberLifecycleResult => {
  if (!facts.member) return fail('MEMBER_NOT_FOUND')
  if (!facts.isCallerOrgAdmin) return fail('ONLY_ADMIN_CAN_REMOVE_MEMBERS')
  if (!facts.adminUserId) return fail('ORGANIZATION_NOT_FOUND')
  return { ok: true, member: facts.member, adminUserId: facts.adminUserId }
}

export const leaveOrganizationPolicy = (facts: {
  member: MemberRef | null
  isCallerOrgAdmin: boolean
  adminUserId: string | null
}): MemberLifecycleResult => {
  // Admin check runs first so an admin trying to leave their own org gets
  // the clearer ADMIN_CANNOT_LEAVE instead of the generic NOT_MEMBER_OF_ORG.
  if (facts.isCallerOrgAdmin) return fail('ADMIN_CANNOT_LEAVE')
  if (!facts.member) return fail('NOT_MEMBER_OF_ORG')
  if (!facts.adminUserId) return fail('ORGANIZATION_NOT_FOUND')
  return { ok: true, member: facts.member, adminUserId: facts.adminUserId }
}

// Spec §4.5: assignments must transfer to admin before membership deletion.
// Used by both the client mutation and the server handler — the write port
// is side-specific but the run loop is shared.

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
