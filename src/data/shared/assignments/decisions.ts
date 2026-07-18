import * as authzPolicy from '@/data/shared/authz/policy'
import { defineDecision, factPlanFor } from '@/data/shared/facts/decisions'
import {
  policyFail as fail,
  policyOk as ok,
  type PolicyResult
} from '@/data/shared/policy-result'

// Decision-style bindings for the assignment lifecycle. The first plan
// entry resolves the generator's org id; every downstream entry
// short-circuits (returns null from `input()`) when the generator doesn't
// exist, letting the rule fall through to GENERATOR_NOT_FOUND without
// paying for the fan-out.

// ── assignUserToGenerator ───────────────────────────────────────────────────

export interface AssignUserToGeneratorArgs {
  callerUserId: string
  generatorId: string
  targetUserId: string
}

interface AssignUserToGeneratorFacts {
  orgId: string | null
  authzOrg?: authzPolicy.OrgAuthzFact | null
  targetIsOrgMember?: boolean
  alreadyAssigned?: boolean
}

const assignUserToGeneratorPlan = factPlanFor<
  AssignUserToGeneratorArgs,
  AssignUserToGeneratorFacts
>()

export const assignUserToGenerator = defineDecision<
  AssignUserToGeneratorArgs,
  AssignUserToGeneratorFacts,
  PolicyResult
>({
  id: 'assignments.assignUserToGenerator',
  plan: [
    assignUserToGeneratorPlan('orgId', 'generator.orgId', a => a.generatorId),
    assignUserToGeneratorPlan(
      'authzOrg',
      'authz.org',
      (_a, f) => f.orgId ?? null
    ),
    assignUserToGeneratorPlan(
      'targetIsOrgMember',
      'orgMembership.hasForUserAndOrg',
      // Admin-self case: skip the membership lookup — the rule below ignores
      // `targetIsOrgMember` when the caller is assigning themselves.
      (a, f) =>
        a.callerUserId === a.targetUserId || !f.orgId
          ? null
          : { userId: a.targetUserId, organizationId: f.orgId }
    ),
    assignUserToGeneratorPlan(
      'alreadyAssigned',
      'assignment.hasForUserAndGenerator',
      (a, f) =>
        f.orgId ? { userId: a.targetUserId, generatorId: a.generatorId } : null
    )
  ],
  rule: (args, facts) => {
    if (facts.orgId === null) return fail('GENERATOR_NOT_FOUND')
    if (
      !authzPolicy.isOrgAdmin(
        args.callerUserId,
        facts.authzOrg?.adminUserId ?? null
      )
    )
      return fail('ONLY_ADMIN_CAN_ASSIGN_USERS')
    // Admin assigning themselves doesn't need a membership check — they're
    // implicitly the org owner (the plan skips the lookup for the self case).
    if (args.callerUserId !== args.targetUserId && !facts.targetIsOrgMember)
      return fail('USER_NOT_ORG_MEMBER')
    if (facts.alreadyAssigned) return fail('USER_ALREADY_ASSIGNED')
    return ok
  }
})

// ── unassignUserFromGenerator ───────────────────────────────────────────────

export interface UnassignUserFromGeneratorArgs {
  callerUserId: string
  generatorId: string
  targetUserId: string
}

interface UnassignUserFromGeneratorFacts {
  orgId: string | null
  authzOrg?: authzPolicy.OrgAuthzFact | null
  assignmentExists?: boolean
}

const unassignUserFromGeneratorPlan = factPlanFor<
  UnassignUserFromGeneratorArgs,
  UnassignUserFromGeneratorFacts
>()

export const unassignUserFromGenerator = defineDecision<
  UnassignUserFromGeneratorArgs,
  UnassignUserFromGeneratorFacts,
  PolicyResult
>({
  id: 'assignments.unassignUserFromGenerator',
  plan: [
    unassignUserFromGeneratorPlan(
      'orgId',
      'generator.orgId',
      a => a.generatorId
    ),
    unassignUserFromGeneratorPlan(
      'authzOrg',
      'authz.org',
      (_a, f) => f.orgId ?? null
    ),
    unassignUserFromGeneratorPlan(
      'assignmentExists',
      'assignment.hasForUserAndGenerator',
      (a, f) =>
        f.orgId ? { userId: a.targetUserId, generatorId: a.generatorId } : null
    )
  ],
  rule: (args, facts) => {
    if (facts.orgId === null) return fail('GENERATOR_NOT_FOUND')
    if (
      !authzPolicy.isOrgAdmin(
        args.callerUserId,
        facts.authzOrg?.adminUserId ?? null
      )
    )
      return fail('ONLY_ADMIN_CAN_UNASSIGN_USERS')
    if (!facts.assignmentExists) return fail('USER_NOT_ASSIGNED')
    return ok
  }
})
