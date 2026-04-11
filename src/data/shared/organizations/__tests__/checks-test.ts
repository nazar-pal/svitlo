import type { AuthzChecks } from '@/data/shared/authz'

import { createOrganizationLifecycleChecks } from '../checks'
import type { OrganizationFactsProvider, OrganizationRef } from '../facts'

// Glue-level tests only: verify that the orchestrator fetches the right
// facts and forwards them to the right policy function. Full enumeration
// of policy branches lives in `policy-test.ts`; duplicating it here would
// just add layers to the same assertions against the same error codes.

const CALLER = 'caller-1'
const ADMIN = 'admin-1'
const ORG = 'org-1'

const ORG_REF: OrganizationRef = {
  id: ORG,
  adminUserId: ADMIN
}

function makeFacts(
  overrides: Partial<OrganizationFactsProvider> = {}
): OrganizationFactsProvider {
  return {
    async findOrganization() {
      return null
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

describe('createOrganizationLifecycleChecks', () => {
  describe('renameOrganization', () => {
    it('fetches facts + authz and forwards them into renameOrganizationPolicy', async () => {
      const findOrganization = jest.fn(async () => ORG_REF)
      const isOrgAdmin = jest.fn(async () => true)
      const checks = createOrganizationLifecycleChecks(
        makeFacts({ findOrganization }),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.renameOrganization(CALLER, ORG)).toEqual({ ok: true })
      expect(findOrganization).toHaveBeenCalledWith(ORG)
      expect(isOrgAdmin).toHaveBeenCalledWith(CALLER, ORG)
    })
  })

  describe('deleteOrganization', () => {
    it('fetches facts + authz and surfaces the resolved org through deleteOrganizationPolicy', async () => {
      const findOrganization = jest.fn(async () => ORG_REF)
      const isOrgAdmin = jest.fn(async () => true)
      const checks = createOrganizationLifecycleChecks(
        makeFacts({ findOrganization }),
        makeAuthz({ isOrgAdmin })
      )
      // On success, deleteOrganization surfaces the fetched org so callers
      // can drive the cascade side effect without a second lookup.
      expect(await checks.deleteOrganization(CALLER, ORG)).toEqual({
        ok: true,
        org: ORG_REF
      })
      expect(findOrganization).toHaveBeenCalledWith(ORG)
      expect(isOrgAdmin).toHaveBeenCalledWith(CALLER, ORG)
    })
  })
})
