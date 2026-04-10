import type { AuthzChecks } from '@/data/shared/authz'

import { createGeneratorLifecycleChecks } from '../checks'
import type { GeneratorFactsProvider, GeneratorRef } from '../facts'

// Boundary tests for the generator-lifecycle orchestrator. Every branch of
// every rule goes through `createGeneratorLifecycleChecks` so the tests
// survive internal refactors and exercise the real fact/authz wiring.

const USER = 'user-1'
const ORG = 'org-1'
const GENERATOR = 'gen-1'

const GENERATOR_REF: GeneratorRef = { organizationId: ORG }

function makeFacts(
  overrides: Partial<GeneratorFactsProvider> = {}
): GeneratorFactsProvider {
  return {
    async findGenerator() {
      return null
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
      return false
    },
    async isGeneratorOrgAdmin() {
      return false
    },
    ...overrides
  }
}

describe('createGeneratorLifecycleChecks', () => {
  describe('createGenerator', () => {
    it('asks authz whether the user is an org admin and forwards to policy', async () => {
      const isOrgAdmin = jest.fn(async () => true)
      const checks = createGeneratorLifecycleChecks(
        makeFacts(),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.createGenerator(USER, ORG)).toEqual({ ok: true })
      expect(isOrgAdmin).toHaveBeenCalledWith(USER, ORG)
    })

    it('rejects when authz says the user is not an admin', async () => {
      const checks = createGeneratorLifecycleChecks(
        makeFacts(),
        makeAuthz({
          async isOrgAdmin() {
            return false
          }
        })
      )
      expect(await checks.createGenerator(USER, ORG)).toEqual({
        ok: false,
        code: 'ONLY_ADMIN_CAN_CREATE_GENERATORS'
      })
    })
  })

  describe('updateGenerator', () => {
    it('fetches the generator plus authz and forwards both to policy', async () => {
      const findGenerator = jest.fn(async () => GENERATOR_REF)
      const isGeneratorOrgAdmin = jest.fn(async () => true)
      const checks = createGeneratorLifecycleChecks(
        makeFacts({ findGenerator }),
        makeAuthz({ isGeneratorOrgAdmin })
      )
      expect(await checks.updateGenerator(USER, GENERATOR)).toEqual({
        ok: true
      })
      expect(findGenerator).toHaveBeenCalledWith(GENERATOR)
      expect(isGeneratorOrgAdmin).toHaveBeenCalledWith(USER, GENERATOR)
    })

    it('returns GENERATOR_NOT_FOUND when the row is missing', async () => {
      const checks = createGeneratorLifecycleChecks(
        makeFacts({
          async findGenerator() {
            return null
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return true
          }
        })
      )
      expect(await checks.updateGenerator(USER, GENERATOR)).toEqual({
        ok: false,
        code: 'GENERATOR_NOT_FOUND'
      })
    })

    it('rejects when the user is not an org admin', async () => {
      const checks = createGeneratorLifecycleChecks(
        makeFacts({
          async findGenerator() {
            return GENERATOR_REF
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return false
          }
        })
      )
      expect(await checks.updateGenerator(USER, GENERATOR)).toEqual({
        ok: false,
        code: 'ONLY_ADMIN_CAN_UPDATE_GENERATORS'
      })
    })
  })

  describe('deleteGenerator', () => {
    it('fetches the generator plus authz and forwards both to policy', async () => {
      const findGenerator = jest.fn(async () => GENERATOR_REF)
      const isGeneratorOrgAdmin = jest.fn(async () => true)
      const checks = createGeneratorLifecycleChecks(
        makeFacts({ findGenerator }),
        makeAuthz({ isGeneratorOrgAdmin })
      )
      expect(await checks.deleteGenerator(USER, GENERATOR)).toEqual({
        ok: true
      })
      expect(findGenerator).toHaveBeenCalledWith(GENERATOR)
      expect(isGeneratorOrgAdmin).toHaveBeenCalledWith(USER, GENERATOR)
    })

    it('returns GENERATOR_NOT_FOUND when the row is missing', async () => {
      const checks = createGeneratorLifecycleChecks(
        makeFacts({
          async findGenerator() {
            return null
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return true
          }
        })
      )
      expect(await checks.deleteGenerator(USER, GENERATOR)).toEqual({
        ok: false,
        code: 'GENERATOR_NOT_FOUND'
      })
    })

    it('rejects when the user is not an org admin', async () => {
      const checks = createGeneratorLifecycleChecks(
        makeFacts({
          async findGenerator() {
            return GENERATOR_REF
          }
        }),
        makeAuthz({
          async isGeneratorOrgAdmin() {
            return false
          }
        })
      )
      expect(await checks.deleteGenerator(USER, GENERATOR)).toEqual({
        ok: false,
        code: 'ONLY_ADMIN_CAN_DELETE_GENERATORS'
      })
    })
  })
})
