import type { AuthzChecks } from '@/data/shared/authz'

import {
  createOrganizationLifecycleChecks,
  deleteOrganizationPolicy,
  renameOrganizationPolicy,
  type OrganizationFactsProvider,
  type OrganizationRef
} from '..'

const ORG = 'org-1'
const ADMIN = 'admin-1'
const CALLER = 'caller-1'

function makeOrg(overrides: Partial<OrganizationRef> = {}): OrganizationRef {
  return { id: ORG, adminUserId: ADMIN, ...overrides }
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

describe('renameOrganizationPolicy', () => {
  it('rejects when the organization row is missing', () => {
    expect(
      renameOrganizationPolicy({ org: null, isCallerOrgAdmin: true })
    ).toEqual({ ok: false, code: 'ORGANIZATION_NOT_FOUND' })
  })

  it('prefers ORGANIZATION_NOT_FOUND when both checks fail', () => {
    expect(
      renameOrganizationPolicy({ org: null, isCallerOrgAdmin: false })
    ).toEqual({ ok: false, code: 'ORGANIZATION_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', () => {
    expect(
      renameOrganizationPolicy({ org: makeOrg(), isCallerOrgAdmin: false })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_RENAME_ORG' })
  })

  it('accepts when the caller is the org admin', () => {
    expect(
      renameOrganizationPolicy({ org: makeOrg(), isCallerOrgAdmin: true })
    ).toEqual({ ok: true })
  })
})

describe('deleteOrganizationPolicy', () => {
  it('rejects when the organization row is missing', () => {
    expect(
      deleteOrganizationPolicy({ org: null, isCallerOrgAdmin: true })
    ).toEqual({ ok: false, code: 'ORGANIZATION_NOT_FOUND' })
  })

  it('prefers ORGANIZATION_NOT_FOUND when both checks fail', () => {
    expect(
      deleteOrganizationPolicy({ org: null, isCallerOrgAdmin: false })
    ).toEqual({ ok: false, code: 'ORGANIZATION_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', () => {
    expect(
      deleteOrganizationPolicy({ org: makeOrg(), isCallerOrgAdmin: false })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_DELETE_ORG' })
  })

  it('surfaces the resolved org on success', () => {
    const org = makeOrg()
    expect(deleteOrganizationPolicy({ org, isCallerOrgAdmin: true })).toEqual({
      ok: true,
      org
    })
  })
})

describe('createOrganizationLifecycleChecks', () => {
  describe('renameOrganization', () => {
    it('forwards ONLY_ADMIN_CAN_RENAME_ORG when the caller is not the admin', async () => {
      const checks = createOrganizationLifecycleChecks(
        makeFacts({
          async findOrganization() {
            return makeOrg()
          }
        }),
        makeAuthz({
          async isOrgAdmin() {
            return false
          }
        })
      )
      expect(await checks.renameOrganization(CALLER, ORG)).toEqual({
        ok: false,
        code: 'ONLY_ADMIN_CAN_RENAME_ORG'
      })
    })

    it('forwards ORGANIZATION_NOT_FOUND when findOrganization returns null', async () => {
      const checks = createOrganizationLifecycleChecks(
        makeFacts({
          async findOrganization() {
            return null
          }
        }),
        makeAuthz({
          async isOrgAdmin() {
            return true
          }
        })
      )
      expect(await checks.renameOrganization(CALLER, ORG)).toEqual({
        ok: false,
        code: 'ORGANIZATION_NOT_FOUND'
      })
    })

    it('returns { ok: true } on the happy path', async () => {
      const checks = createOrganizationLifecycleChecks(
        makeFacts({
          async findOrganization() {
            return makeOrg()
          }
        }),
        makeAuthz({
          async isOrgAdmin() {
            return true
          }
        })
      )
      expect(await checks.renameOrganization(CALLER, ORG)).toEqual({ ok: true })
    })

    it('calls isOrgAdmin and findOrganization with the forwarded arguments', async () => {
      const findOrganization = jest.fn(async () => makeOrg())
      const isOrgAdmin = jest.fn(async () => true)
      const checks = createOrganizationLifecycleChecks(
        makeFacts({ findOrganization }),
        makeAuthz({ isOrgAdmin })
      )
      await checks.renameOrganization(CALLER, ORG)
      expect(findOrganization).toHaveBeenCalledWith(ORG)
      expect(isOrgAdmin).toHaveBeenCalledWith(CALLER, ORG)
    })
  })

  describe('deleteOrganization', () => {
    it('forwards ONLY_ADMIN_CAN_DELETE_ORG when the caller is not the admin', async () => {
      const checks = createOrganizationLifecycleChecks(
        makeFacts({
          async findOrganization() {
            return makeOrg()
          }
        }),
        makeAuthz({
          async isOrgAdmin() {
            return false
          }
        })
      )
      expect(await checks.deleteOrganization(CALLER, ORG)).toEqual({
        ok: false,
        code: 'ONLY_ADMIN_CAN_DELETE_ORG'
      })
    })

    it('forwards ORGANIZATION_NOT_FOUND when findOrganization returns null', async () => {
      const checks = createOrganizationLifecycleChecks(
        makeFacts({
          async findOrganization() {
            return null
          }
        }),
        makeAuthz({
          async isOrgAdmin() {
            return true
          }
        })
      )
      expect(await checks.deleteOrganization(CALLER, ORG)).toEqual({
        ok: false,
        code: 'ORGANIZATION_NOT_FOUND'
      })
    })

    it('returns the resolved organization in the payload on success', async () => {
      const org = makeOrg()
      const findOrganization = jest.fn(async () => org)
      const isOrgAdmin = jest.fn(async () => true)
      const checks = createOrganizationLifecycleChecks(
        makeFacts({ findOrganization }),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.deleteOrganization(CALLER, ORG)).toEqual({
        ok: true,
        org
      })
      expect(findOrganization).toHaveBeenCalledWith(ORG)
      expect(isOrgAdmin).toHaveBeenCalledWith(CALLER, ORG)
    })
  })
})
