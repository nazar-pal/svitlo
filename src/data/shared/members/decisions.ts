import * as authzPolicy from '@/data/shared/authz/policy'
import { defineDecision, factPlanFor } from '@/data/shared/facts/decisions'

import {
  leaveOrganizationPolicy,
  removeMemberPolicy,
  type MemberLifecycleResult,
  type MemberRef
} from './index'

// ── removeMember ────────────────────────────────────────────────────────────

interface RemoveMemberArgs {
  callerUserId: string
  memberId: string
}

interface RemoveMemberFacts {
  member: MemberRef | null
  authzOrg?: authzPolicy.OrgAuthzFact | null
}

const removeMemberPlan = factPlanFor<RemoveMemberArgs, RemoveMemberFacts>()

export const removeMember = defineDecision<
  RemoveMemberArgs,
  RemoveMemberFacts,
  MemberLifecycleResult
>({
  plan: [
    removeMemberPlan('member', 'orgMembership.byId', a => a.memberId),
    // Second-stage lookup depends on the membership row's organization;
    // short-circuit when the row is missing so the rule can resolve to
    // MEMBER_NOT_FOUND without a wasted round trip.
    removeMemberPlan(
      'authzOrg',
      'authz.org',
      (_a, f) => f.member?.organizationId ?? null
    )
  ],
  rule: (args, facts) =>
    removeMemberPolicy({
      member: facts.member,
      isCallerOrgAdmin: authzPolicy.isOrgAdmin(
        args.callerUserId,
        facts.authzOrg?.adminUserId ?? null
      ),
      adminUserId: facts.authzOrg?.adminUserId ?? null
    })
})

// ── leaveOrganization ───────────────────────────────────────────────────────

interface LeaveOrganizationArgs {
  userId: string
  organizationId: string
}

interface LeaveOrganizationFacts {
  authzOrg: authzPolicy.OrgAuthzFact | null
  member: MemberRef | null
}

const leaveOrganizationPlan = factPlanFor<
  LeaveOrganizationArgs,
  LeaveOrganizationFacts
>()

export const leaveOrganization = defineDecision<
  LeaveOrganizationArgs,
  LeaveOrganizationFacts,
  MemberLifecycleResult
>({
  plan: [
    leaveOrganizationPlan('authzOrg', 'authz.org', a => a.organizationId),
    leaveOrganizationPlan('member', 'orgMembership.byUserAndOrg', a => ({
      userId: a.userId,
      organizationId: a.organizationId
    }))
  ],
  rule: (args, facts) =>
    leaveOrganizationPolicy({
      member: facts.member,
      isCallerOrgAdmin: authzPolicy.isOrgAdmin(
        args.userId,
        facts.authzOrg?.adminUserId ?? null
      ),
      adminUserId: facts.authzOrg?.adminUserId ?? null
    })
})
