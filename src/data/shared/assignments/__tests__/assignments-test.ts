import {
  assignUserToGeneratorPolicy,
  unassignUserFromGeneratorPolicy
} from '..'

describe('assignUserToGeneratorPolicy', () => {
  const validFacts = {
    generatorExists: true,
    isCallerOrgAdmin: true,
    targetIsSelf: false,
    targetIsOrgMember: true,
    alreadyAssigned: false
  }

  it('rejects when the generator does not exist', () => {
    expect(
      assignUserToGeneratorPolicy({ ...validFacts, generatorExists: false })
    ).toEqual({ ok: false, code: 'GENERATOR_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', () => {
    expect(
      assignUserToGeneratorPolicy({ ...validFacts, isCallerOrgAdmin: false })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_ASSIGN_USERS' })
  })

  it('rejects when the target is not an org member (non-self)', () => {
    expect(
      assignUserToGeneratorPolicy({ ...validFacts, targetIsOrgMember: false })
    ).toEqual({ ok: false, code: 'USER_NOT_ORG_MEMBER' })
  })

  it('accepts when the target is self (skips membership check)', () => {
    expect(
      assignUserToGeneratorPolicy({
        ...validFacts,
        targetIsSelf: true,
        targetIsOrgMember: false
      })
    ).toEqual({ ok: true })
  })

  it('rejects when the user is already assigned', () => {
    expect(
      assignUserToGeneratorPolicy({ ...validFacts, alreadyAssigned: true })
    ).toEqual({ ok: false, code: 'USER_ALREADY_ASSIGNED' })
  })

  it('accepts the happy path', () => {
    expect(assignUserToGeneratorPolicy(validFacts)).toEqual({ ok: true })
  })
})

describe('unassignUserFromGeneratorPolicy', () => {
  const validFacts = {
    generatorExists: true,
    isCallerOrgAdmin: true,
    assignmentExists: true
  }

  it('rejects when the generator does not exist', () => {
    expect(
      unassignUserFromGeneratorPolicy({ ...validFacts, generatorExists: false })
    ).toEqual({ ok: false, code: 'GENERATOR_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', () => {
    expect(
      unassignUserFromGeneratorPolicy({
        ...validFacts,
        isCallerOrgAdmin: false
      })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_UNASSIGN_USERS' })
  })

  it('rejects when the assignment does not exist', () => {
    expect(
      unassignUserFromGeneratorPolicy({
        ...validFacts,
        assignmentExists: false
      })
    ).toEqual({ ok: false, code: 'USER_NOT_ASSIGNED' })
  })

  it('accepts the happy path', () => {
    expect(unassignUserFromGeneratorPolicy(validFacts)).toEqual({ ok: true })
  })
})

// Boundary tests: orchestrator behaviors the pure policies can't express.
// (1) GENERATOR_NOT_FOUND short-circuits skip the downstream authz+facts
// fan-out. (2) Admin self-assign skips the membership lookup — a measurable
// round-trip saving the policy can't encode because it only sees the merged
