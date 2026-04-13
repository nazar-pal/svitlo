import type { AuthzChecks } from '@/data/shared/authz'
import type { ParamFreeMutationErrorCode } from '@/data/shared/errors'
import type { PolicyResult } from '@/data/shared/policy-result'

export type { PolicyResult }

// --- Facts port ---

// Fact shapes the member-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

// `id` is the membership row id — both entry points (admin-removes and
// self-leaves) need it for the downstream transfer-and-delete side effect,
// so carrying it on MemberRef lets the policy result be a single shape.
export interface MemberRef {
  id: string
  organizationId: string
  userId: string
}

export interface OrgAdminRef {
  adminUserId: string
}

// Port: adapters answer "is this membership row present" and
// "who is the admin of this org". Both client (SQLite) and server (Postgres)
// implement it against their own dialect.
export interface MemberFactsProvider {
  findMembershipById(memberId: string): Promise<MemberRef | null>
  findMembershipByUserAndOrg(
    userId: string,
    organizationId: string
  ): Promise<MemberRef | null>
  findOrgAdmin(organizationId: string): Promise<OrgAdminRef | null>
}

// --- Pure policy rules ---

// Pure member-lifecycle rules. No I/O. Callers fetch facts, then ask the
// policy. Both client (PowerSync SQLite) and server (Postgres) reuse these
// so the rule set lives in exactly one place — per spec §4.5, removing a
// member or leaving an org must transfer the departing user's generator
// assignments to the org admin.

// Local `fail` helper so the return type narrows to just the failure
// variant — `policyFail` returns the wider `PolicyResult` which breaks
// inference for the richer success shapes below.
const fail = (
  code: ParamFreeMutationErrorCode
): { ok: false; code: ParamFreeMutationErrorCode } => ({ ok: false, code })

// Admin-initiated removal. Returns the resolved member so the caller can
// drive the transfer-and-delete side effect without a second lookup.
export type RemoveMemberResult =
  | { ok: true; member: MemberRef; adminUserId: string }
  | Exclude<PolicyResult, { ok: true }>

// Self-initiated leave. Same success shape as RemoveMemberResult so both
// entry points can share the downstream side-effect code.
export type LeaveOrganizationResult =
  | { ok: true; member: MemberRef; adminUserId: string }
  | Exclude<PolicyResult, { ok: true }>

export const removeMemberPolicy = (facts: {
  member: MemberRef | null
  isCallerOrgAdmin: boolean
  adminUserId: string | null
}): RemoveMemberResult => {
  if (!facts.member) return fail('MEMBER_NOT_FOUND')
  if (!facts.isCallerOrgAdmin) return fail('ONLY_ADMIN_CAN_REMOVE_MEMBERS')
  if (!facts.adminUserId) return fail('ORGANIZATION_NOT_FOUND')
  return { ok: true, member: facts.member, adminUserId: facts.adminUserId }
}

export const leaveOrganizationPolicy = (facts: {
  member: MemberRef | null
  isCallerOrgAdmin: boolean
  adminUserId: string | null
}): LeaveOrganizationResult => {
  // Admin check runs first so an admin trying to leave their own org gets
  // the clearer ADMIN_CANNOT_LEAVE instead of the generic NOT_MEMBER_OF_ORG.
  if (facts.isCallerOrgAdmin) return fail('ADMIN_CANNOT_LEAVE')
  if (!facts.member) return fail('NOT_MEMBER_OF_ORG')
  if (!facts.adminUserId) return fail('ORGANIZATION_NOT_FOUND')
  return { ok: true, member: facts.member, adminUserId: facts.adminUserId }
}

// --- Lifecycle orchestrator — wires facts + authz → policy ---

export interface MemberLifecycleChecks {
  removeMember(
    callerUserId: string,
    memberId: string
  ): Promise<RemoveMemberResult>
  leaveOrganization(
    userId: string,
    organizationId: string
  ): Promise<LeaveOrganizationResult>
}

// Single source of truth for member-lifecycle decisions. Both client
// (PowerSync SQLite) and server (Postgres) adapters funnel through here —
// each side only customises how facts get fetched and how authz is built.
export function createMemberLifecycleChecks(
  facts: MemberFactsProvider,
  authz: AuthzChecks
): MemberLifecycleChecks {
  return {
    async removeMember(callerUserId, memberId) {
      const member = await facts.findMembershipById(memberId)
      // Short-circuit the authz + admin lookups when the row is missing.
      // Saves two round trips on the lost-ack replay path (server sees
      // delete for a row already gone).
      if (!member) return { ok: false, code: 'MEMBER_NOT_FOUND' }
      const [isCallerOrgAdmin, adminRef] = await Promise.all([
        authz.isOrgAdmin(callerUserId, member.organizationId),
        facts.findOrgAdmin(member.organizationId)
      ])
      return removeMemberPolicy({
        member,
        isCallerOrgAdmin,
        adminUserId: adminRef?.adminUserId ?? null
      })
    },

    async leaveOrganization(userId, organizationId) {
      const [isCallerOrgAdmin, member, adminRef] = await Promise.all([
        authz.isOrgAdmin(userId, organizationId),
        facts.findMembershipByUserAndOrg(userId, organizationId),
        facts.findOrgAdmin(organizationId)
      ])
      return leaveOrganizationPolicy({
        member,
        isCallerOrgAdmin,
        adminUserId: adminRef?.adminUserId ?? null
      })
    }
  }
}

// --- Side-effects port + runner ---

// Spec §4.5: assignments must transfer to admin before membership deletion.

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
