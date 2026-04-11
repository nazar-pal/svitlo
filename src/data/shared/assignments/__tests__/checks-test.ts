import type { AuthzChecks } from '@/data/shared/authz'

import { createAssignmentLifecycleChecks } from '../checks'
import type { AssignmentFactsProvider } from '../facts'

// Glue-level tests only: verify that the orchestrator fetches the right
// facts and forwards them to the right policy function. Full enumeration
// of policy branches lives in `policy-test.ts`; duplicating it here would
// just add layers to the same assertions against the same error codes.

const CALLER = 'caller-1'
const TARGET = 'user-1'
const GENERATOR = 'generator-1'
const ORG = 'org-1'

function makeFacts(
  overrides: Partial<AssignmentFactsProvider> = {}
): AssignmentFactsProvider {
  return {
    async findGeneratorOrgId() {
      return null
    },
    async isOrgMember() {
      return false
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
      return false
    },
    async isOrgAdmin() {
      return false
    },
    async isGeneratorOrgAdmin() {
      return false
    },
    ...overrides
  }
}

describe('createAssignmentLifecycleChecks', () => {
  describe('assignUserToGenerator', () => {
    it('short-circuits GENERATOR_NOT_FOUND without calling authz, isOrgMember, or hasAssignment', async () => {
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

    it('fetches isOrgAdmin, isOrgMember, and hasAssignment in parallel and returns the ok payload', async () => {
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

    it('skips the isOrgMember fetch when caller is assigning themselves', async () => {
      const isOrgMember = jest.fn(async () => false)
      const checks = createAssignmentLifecycleChecks(
        makeFacts({
          async findGeneratorOrgId() {
            return ORG
          },
          isOrgMember,
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
        await checks.assignUserToGenerator(CALLER, GENERATOR, CALLER)
      ).toEqual({ ok: true })
      expect(isOrgMember).not.toHaveBeenCalled()
    })

    it('forwards a not-admin authz result through to the policy', async () => {
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

    it('forwards a non-member target through to the policy as USER_NOT_ORG_MEMBER', async () => {
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

    it('forwards an already-assigned target through to the policy as USER_ALREADY_ASSIGNED', async () => {
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
  })

  describe('unassignUserFromGenerator', () => {
    it('short-circuits GENERATOR_NOT_FOUND without calling authz or hasAssignment', async () => {
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

    it('fetches isOrgAdmin and hasAssignment in parallel and returns the ok payload', async () => {
      const findGeneratorOrgId = jest.fn(async () => ORG)
      const isOrgAdmin = jest.fn(async () => true)
      const hasAssignment = jest.fn(async () => true)
      const checks = createAssignmentLifecycleChecks(
        makeFacts({ findGeneratorOrgId, hasAssignment }),
        makeAuthz({ isOrgAdmin })
      )
      expect(
        await checks.unassignUserFromGenerator(CALLER, GENERATOR, TARGET)
      ).toEqual({ ok: true })
      expect(findGeneratorOrgId).toHaveBeenCalledWith(GENERATOR)
      expect(isOrgAdmin).toHaveBeenCalledWith(CALLER, ORG)
      expect(hasAssignment).toHaveBeenCalledWith(TARGET, GENERATOR)
    })

    it('forwards a not-admin authz result through to the policy', async () => {
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

    it('forwards a missing assignment through to the policy as USER_NOT_ASSIGNED', async () => {
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
  })
})
