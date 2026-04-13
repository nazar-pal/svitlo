import type { AuthzChecks } from '@/data/shared/authz'

import {
  assignUserToGeneratorPolicy,
  createAssignmentLifecycleChecks,
  unassignUserFromGeneratorPolicy,
  type AssignmentFactsProvider
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
// boolean.
describe('createAssignmentLifecycleChecks', () => {
  const CALLER = 'caller-1'
  const TARGET = 'target-1'
  const GENERATOR = 'gen-1'
  const ORG = 'org-1'

  function makeFacts(
    overrides: Partial<AssignmentFactsProvider> = {}
  ): AssignmentFactsProvider {
    return {
      async findGeneratorOrgId() {
        return null
      },
      async isOrgMember() {
        return true
      },
      async hasAssignment() {
        return false
      },
      ...overrides
    }
  }

  function makeAuthz(overrides: Partial<AuthzChecks> = {}): AuthzChecks {
    return {
      async canAccessGenerator() {
        return true
      },
      async isOrgAdmin() {
        return true
      },
      async isGeneratorOrgAdmin() {
        return true
      },
      ...overrides
    }
  }

  it('assignUserToGenerator short-circuits to GENERATOR_NOT_FOUND without fanning out', async () => {
    const isOrgAdmin = jest.fn(async () => true)
    const isOrgMember = jest.fn(async () => true)
    const hasAssignment = jest.fn(async () => false)
    const checks = createAssignmentLifecycleChecks(
      makeFacts({ isOrgMember, hasAssignment }),
      makeAuthz({ isOrgAdmin })
    )
    expect(
      await checks.assignUserToGenerator(CALLER, GENERATOR, TARGET)
    ).toEqual({ ok: false, code: 'GENERATOR_NOT_FOUND' })
    expect(isOrgAdmin).not.toHaveBeenCalled()
    expect(isOrgMember).not.toHaveBeenCalled()
    expect(hasAssignment).not.toHaveBeenCalled()
  })

  it('unassignUserFromGenerator short-circuits to GENERATOR_NOT_FOUND without fanning out', async () => {
    const isOrgAdmin = jest.fn(async () => true)
    const hasAssignment = jest.fn(async () => true)
    const checks = createAssignmentLifecycleChecks(
      makeFacts({ hasAssignment }),
      makeAuthz({ isOrgAdmin })
    )
    expect(
      await checks.unassignUserFromGenerator(CALLER, GENERATOR, TARGET)
    ).toEqual({ ok: false, code: 'GENERATOR_NOT_FOUND' })
    expect(isOrgAdmin).not.toHaveBeenCalled()
    expect(hasAssignment).not.toHaveBeenCalled()
  })

  it('assignUserToGenerator skips the membership lookup when caller assigns themselves', async () => {
    const isOrgMember = jest.fn(async () => true)
    const checks = createAssignmentLifecycleChecks(
      makeFacts({
        async findGeneratorOrgId() {
          return ORG
        },
        isOrgMember
      }),
      makeAuthz()
    )
    expect(
      await checks.assignUserToGenerator(CALLER, GENERATOR, CALLER)
    ).toEqual({ ok: true })
    expect(isOrgMember).not.toHaveBeenCalled()
  })

  it('assignUserToGenerator forwards ONLY_ADMIN_CAN_ASSIGN_USERS when caller is not admin', async () => {
    const checks = createAssignmentLifecycleChecks(
      makeFacts({
        async findGeneratorOrgId() {
          return ORG
        },
        async isOrgMember() {
          return true
        },
        async hasAssignment() {
          return false
        }
      }),
      makeAuthz({
        async isOrgAdmin() {
          return false
        }
      })
    )
    expect(
      await checks.assignUserToGenerator(CALLER, GENERATOR, TARGET)
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_ASSIGN_USERS' })
  })

  it('assignUserToGenerator forwards USER_NOT_ORG_MEMBER when target is not a member', async () => {
    const checks = createAssignmentLifecycleChecks(
      makeFacts({
        async findGeneratorOrgId() {
          return ORG
        },
        async isOrgMember() {
          return false
        },
        async hasAssignment() {
          return false
        }
      }),
      makeAuthz({
        async isOrgAdmin() {
          return true
        }
      })
    )
    expect(
      await checks.assignUserToGenerator(CALLER, GENERATOR, TARGET)
    ).toEqual({ ok: false, code: 'USER_NOT_ORG_MEMBER' })
  })

  it('assignUserToGenerator forwards USER_ALREADY_ASSIGNED when target already has an assignment', async () => {
    const checks = createAssignmentLifecycleChecks(
      makeFacts({
        async findGeneratorOrgId() {
          return ORG
        },
        async isOrgMember() {
          return true
        },
        async hasAssignment() {
          return true
        }
      }),
      makeAuthz({
        async isOrgAdmin() {
          return true
        }
      })
    )
    expect(
      await checks.assignUserToGenerator(CALLER, GENERATOR, TARGET)
    ).toEqual({ ok: false, code: 'USER_ALREADY_ASSIGNED' })
  })

  it('unassignUserFromGenerator forwards ONLY_ADMIN_CAN_UNASSIGN_USERS when caller is not admin', async () => {
    const checks = createAssignmentLifecycleChecks(
      makeFacts({
        async findGeneratorOrgId() {
          return ORG
        },
        async hasAssignment() {
          return true
        }
      }),
      makeAuthz({
        async isOrgAdmin() {
          return false
        }
      })
    )
    expect(
      await checks.unassignUserFromGenerator(CALLER, GENERATOR, TARGET)
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_UNASSIGN_USERS' })
  })

  it('unassignUserFromGenerator forwards USER_NOT_ASSIGNED when no assignment exists', async () => {
    const checks = createAssignmentLifecycleChecks(
      makeFacts({
        async findGeneratorOrgId() {
          return ORG
        },
        async hasAssignment() {
          return false
        }
      }),
      makeAuthz({
        async isOrgAdmin() {
          return true
        }
      })
    )
    expect(
      await checks.unassignUserFromGenerator(CALLER, GENERATOR, TARGET)
    ).toEqual({ ok: false, code: 'USER_NOT_ASSIGNED' })
  })

  it('forwards arguments correctly to facts and authz probes', async () => {
    const findGeneratorOrgId = jest.fn(async () => ORG)
    const isOrgAdmin = jest.fn(async () => true)
    const isOrgMember = jest.fn(async () => true)
    const hasAssignment = jest.fn(async () => false)
    const checks = createAssignmentLifecycleChecks(
      makeFacts({ findGeneratorOrgId, isOrgMember, hasAssignment }),
      makeAuthz({ isOrgAdmin })
    )
    expect(
      await checks.assignUserToGenerator(CALLER, GENERATOR, TARGET)
    ).toEqual({ ok: true })
    expect(findGeneratorOrgId).toHaveBeenCalledWith(GENERATOR)
    expect(isOrgAdmin).toHaveBeenCalledWith(CALLER, ORG)
    expect(isOrgMember).toHaveBeenCalledWith(TARGET, ORG)
    expect(hasAssignment).toHaveBeenCalledWith(TARGET, GENERATOR)
  })
})
