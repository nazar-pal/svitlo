import {
  policyFail as fail,
  policyOk as ok,
  type PolicyResult
} from '@/data/shared/policy-result'

export type { PolicyResult }

// Pure assignment-lifecycle rules. No I/O. Decisions in `./decisions.ts`
// wire the facts + authz providers to these rules.

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
