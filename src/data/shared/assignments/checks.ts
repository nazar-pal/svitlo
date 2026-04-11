import type { AuthzChecks } from '@/data/shared/authz'

import type { AssignmentFactsProvider } from './facts'
import * as policy from './policy'
import type { PolicyResult } from './policy'

export interface AssignmentLifecycleChecks {
  assignUserToGenerator(
    callerUserId: string,
    generatorId: string,
    targetUserId: string
  ): Promise<PolicyResult>
  unassignUserFromGenerator(
    callerUserId: string,
    generatorId: string,
    targetUserId: string
  ): Promise<PolicyResult>
}

// Single source of truth for assignment-lifecycle decisions. Both client
// (PowerSync SQLite) and server (Postgres) adapters funnel through here —
// each side only customises how facts get fetched and how authz is built.
export function createAssignmentLifecycleChecks(
  facts: AssignmentFactsProvider,
  authz: AuthzChecks
): AssignmentLifecycleChecks {
  return {
    async assignUserToGenerator(callerUserId, generatorId, targetUserId) {
      // Two-step fetch: `isCallerOrgAdmin` depends on knowing the
      // generator's org id, so resolve that first. Short-circuit early on
      // `GENERATOR_NOT_FOUND` to avoid the downstream fan-out.
      const orgId = await facts.findGeneratorOrgId(generatorId)
      if (!orgId)
        return policy.assignUserToGeneratorPolicy({
          generatorExists: false,
          isCallerOrgAdmin: false,
          targetIsSelf: false,
          targetIsOrgMember: false,
          alreadyAssigned: false
        })

      const targetIsSelf = callerUserId === targetUserId
      const [isCallerOrgAdmin, targetIsOrgMember, alreadyAssigned] =
        await Promise.all([
          authz.isOrgAdmin(callerUserId, orgId),
          // Admin-self case skips the membership lookup — the policy
          // ignores `targetIsOrgMember` when `targetIsSelf` is true.
          targetIsSelf
            ? Promise.resolve(false)
            : facts.isOrgMember(targetUserId, orgId),
          facts.hasAssignment(targetUserId, generatorId)
        ])

      return policy.assignUserToGeneratorPolicy({
        generatorExists: true,
        isCallerOrgAdmin,
        targetIsSelf,
        targetIsOrgMember,
        alreadyAssigned
      })
    },

    async unassignUserFromGenerator(callerUserId, generatorId, targetUserId) {
      const orgId = await facts.findGeneratorOrgId(generatorId)
      if (!orgId)
        return policy.unassignUserFromGeneratorPolicy({
          generatorExists: false,
          isCallerOrgAdmin: false,
          assignmentExists: false
        })

      const [isCallerOrgAdmin, assignmentExists] = await Promise.all([
        authz.isOrgAdmin(callerUserId, orgId),
        facts.hasAssignment(targetUserId, generatorId)
      ])

      return policy.unassignUserFromGeneratorPolicy({
        generatorExists: true,
        isCallerOrgAdmin,
        assignmentExists
      })
    }
  }
}
