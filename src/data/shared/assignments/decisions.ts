import * as authzPolicy from '@/data/shared/authz/policy'
import { defineDecision, factPlanFor } from '@/data/shared/facts/decisions'

import {
  assignUserToGeneratorPolicy,
  unassignUserFromGeneratorPolicy,
  type PolicyResult
} from './index'

// Decision-style bindings for the assignment lifecycle. The first plan
// entry resolves the generator's org id; every downstream entry
// short-circuits (returns null from `input()`) when the generator doesn't
// exist, letting the rule fall through to GENERATOR_NOT_FOUND without
// paying for the fan-out.

type OrgAuthzFact = { adminUserId: string | null } | null

// ── assignUserToGenerator ───────────────────────────────────────────────────

export interface AssignUserToGeneratorArgs {
  callerUserId: string
  generatorId: string
  targetUserId: string
}

interface AssignUserToGeneratorFacts {
  orgId: string | null
  authzOrg: OrgAuthzFact
  targetIsOrgMember: boolean
  alreadyAssigned: boolean
}

const assignPlan = factPlanFor<
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
    assignPlan('orgId', 'generator.orgId', a => a.generatorId),
    assignPlan('authzOrg', 'authz.org', (_a, f) => f.orgId ?? null),
    assignPlan(
      'targetIsOrgMember',
      'orgMembership.hasForUserAndOrg',
      // Admin-self case: skip the membership lookup — the policy ignores
      // `targetIsOrgMember` when `targetIsSelf` is true.
      (a, f) =>
        a.callerUserId === a.targetUserId || !f.orgId
          ? null
          : { userId: a.targetUserId, organizationId: f.orgId }
    ),
    assignPlan(
      'alreadyAssigned',
      'assignment.hasForUserAndGenerator',
      (a, f) =>
        f.orgId ? { userId: a.targetUserId, generatorId: a.generatorId } : null
    )
  ],
  rule: (args, facts) =>
    assignUserToGeneratorPolicy({
      generatorExists: facts.orgId !== null,
      isCallerOrgAdmin: authzPolicy.isOrgAdmin(
        args.callerUserId,
        facts.authzOrg?.adminUserId ?? null
      ),
      targetIsSelf: args.callerUserId === args.targetUserId,
      targetIsOrgMember: facts.targetIsOrgMember ?? false,
      alreadyAssigned: facts.alreadyAssigned ?? false
    })
})

// ── unassignUserFromGenerator ───────────────────────────────────────────────

export interface UnassignUserFromGeneratorArgs {
  callerUserId: string
  generatorId: string
  targetUserId: string
}

interface UnassignUserFromGeneratorFacts {
  orgId: string | null
  authzOrg: OrgAuthzFact
  assignmentExists: boolean
}

const unassignPlan = factPlanFor<
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
    unassignPlan('orgId', 'generator.orgId', a => a.generatorId),
    unassignPlan('authzOrg', 'authz.org', (_a, f) => f.orgId ?? null),
    unassignPlan(
      'assignmentExists',
      'assignment.hasForUserAndGenerator',
      (a, f) =>
        f.orgId ? { userId: a.targetUserId, generatorId: a.generatorId } : null
    )
  ],
  rule: (args, facts) =>
    unassignUserFromGeneratorPolicy({
      generatorExists: facts.orgId !== null,
      isCallerOrgAdmin: authzPolicy.isOrgAdmin(
        args.callerUserId,
        facts.authzOrg?.adminUserId ?? null
      ),
      assignmentExists: facts.assignmentExists ?? false
    })
})
