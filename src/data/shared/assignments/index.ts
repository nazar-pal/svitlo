import type { AuthzChecks } from '@/data/shared/authz'
import {
  policyFail as fail,
  policyOk as ok,
  type PolicyResult
} from '@/data/shared/policy-result'

export type { PolicyResult }

// --- Facts port ---

// Fact shapes the assignment-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

// Port: anything that can answer these three questions is a valid fact source.
// `findGeneratorOrgId` returns `null` when the generator does not exist, and
// doubles as the "does generator exist?" probe — same pattern as sessions.
export interface AssignmentFactsProvider {
  findGeneratorOrgId(generatorId: string): Promise<string | null>
  isOrgMember(userId: string, organizationId: string): Promise<boolean>
  hasAssignment(userId: string, generatorId: string): Promise<boolean>
}

// --- Pure policy rules ---

// Pure assignment-lifecycle rules. No I/O. Callers fetch facts, then ask the
// policy. Both client (PowerSync SQLite) and server (Postgres) reuse these
// so the rules live in exactly one place.

export const assignUserToGeneratorPolicy = (facts: {
  generatorExists: boolean
  isCallerOrgAdmin: boolean
  targetIsSelf: boolean
  targetIsOrgMember: boolean
  alreadyAssigned: boolean
}): PolicyResult => {
  if (!facts.generatorExists) return fail('GENERATOR_NOT_FOUND')
  if (!facts.isCallerOrgAdmin) return fail('ONLY_ADMIN_CAN_ASSIGN_USERS')
  // Admin assigning themselves doesn't need a membership check — they're
  // implicitly the org owner.
  if (!facts.targetIsSelf && !facts.targetIsOrgMember)
    return fail('USER_NOT_ORG_MEMBER')
  if (facts.alreadyAssigned) return fail('USER_ALREADY_ASSIGNED')
  return ok
}

export const unassignUserFromGeneratorPolicy = (facts: {
  generatorExists: boolean
  isCallerOrgAdmin: boolean
  assignmentExists: boolean
}): PolicyResult => {
  if (!facts.generatorExists) return fail('GENERATOR_NOT_FOUND')
  if (!facts.isCallerOrgAdmin) return fail('ONLY_ADMIN_CAN_UNASSIGN_USERS')
  if (!facts.assignmentExists) return fail('USER_NOT_ASSIGNED')
  return ok
}

// --- Lifecycle orchestrator — wires facts + authz → policy ---

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
        return assignUserToGeneratorPolicy({
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

      return assignUserToGeneratorPolicy({
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
        return unassignUserFromGeneratorPolicy({
          generatorExists: false,
          isCallerOrgAdmin: false,
          assignmentExists: false
        })

      const [isCallerOrgAdmin, assignmentExists] = await Promise.all([
        authz.isOrgAdmin(callerUserId, orgId),
        facts.hasAssignment(targetUserId, generatorId)
      ])

      return unassignUserFromGeneratorPolicy({
        generatorExists: true,
        isCallerOrgAdmin,
        assignmentExists
      })
    }
  }
}
