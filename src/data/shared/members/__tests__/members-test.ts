import type { AuthzChecks } from '@/data/shared/authz'

import {
  createMemberLifecycleChecks,
  leaveOrganizationPolicy,
  removeMemberPolicy,
  type MemberFactsProvider,
  type MemberRef
} from '..'

const ORG = 'org-1'
const USER = 'user-1'
const ADMIN = 'admin-1'
const MEMBERSHIP = 'membership-1'

function makeMember(overrides: Partial<MemberRef> = {}): MemberRef {
  return {
    id: MEMBERSHIP,
    organizationId: ORG,
    userId: USER,
    ...overrides
  }
}

describe('removeMemberPolicy', () => {
  it('rejects when the membership row is missing', () => {
    expect(
      removeMemberPolicy({
        member: null,
        isCallerOrgAdmin: true,
        adminUserId: ADMIN
      })
    ).toEqual({ ok: false, code: 'MEMBER_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', () => {
    expect(
      removeMemberPolicy({
        member: makeMember(),
        isCallerOrgAdmin: false,
        adminUserId: ADMIN
      })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_REMOVE_MEMBERS' })
  })

  it('rejects when the org has no admin (missing org)', () => {
    expect(
      removeMemberPolicy({
        member: makeMember(),
        isCallerOrgAdmin: true,
        adminUserId: null
      })
    ).toEqual({ ok: false, code: 'ORGANIZATION_NOT_FOUND' })
  })

  it('surfaces the resolved member and admin user id on success', () => {
    const member = makeMember()
    expect(
      removeMemberPolicy({
        member,
        isCallerOrgAdmin: true,
        adminUserId: ADMIN
      })
    ).toEqual({ ok: true, member, adminUserId: ADMIN })
  })
})

describe('leaveOrganizationPolicy', () => {
  it('rejects an admin trying to leave their own org', () => {
    expect(
      leaveOrganizationPolicy({
        member: makeMember(),
        isCallerOrgAdmin: true,
        adminUserId: ADMIN
      })
    ).toEqual({ ok: false, code: 'ADMIN_CANNOT_LEAVE' })
  })

  it('rejects when the caller has no membership row', () => {
    expect(
      leaveOrganizationPolicy({
        member: null,
        isCallerOrgAdmin: false,
        adminUserId: ADMIN
      })
    ).toEqual({ ok: false, code: 'NOT_MEMBER_OF_ORG' })
  })

  it('rejects when the org has no admin (missing org)', () => {
    expect(
      leaveOrganizationPolicy({
        member: makeMember(),
        isCallerOrgAdmin: false,
        adminUserId: null
      })
    ).toEqual({ ok: false, code: 'ORGANIZATION_NOT_FOUND' })
  })

  it('surfaces the resolved member and admin user id on success', () => {
    const member = makeMember()
    expect(
      leaveOrganizationPolicy({
        member,
        isCallerOrgAdmin: false,
        adminUserId: ADMIN
      })
    ).toEqual({ ok: true, member, adminUserId: ADMIN })
  })
})

// Boundary tests: the orchestrator composes fact lookups + authz + policy.
// Policy branches are covered above; these tests pin the glue — fact-fetch
// short-circuits, concurrent fetches, and authz-result forwarding.
describe('createMemberLifecycleChecks', () => {
  const CALLER = 'caller-1'

  function makeFacts(
    overrides: Partial<MemberFactsProvider> = {}
  ): MemberFactsProvider {
    return {
      async findMembershipById() {
        return null
      },
      async findMembershipByUserAndOrg() {
        return null
      },
      async findOrgAdmin() {
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

  describe('removeMember', () => {
    it('short-circuits MEMBER_NOT_FOUND without calling authz or findOrgAdmin', async () => {
      const isOrgAdmin = jest.fn(async () => true)
      const findOrgAdmin = jest.fn(async () => ({ adminUserId: ADMIN }))
      const checks = createMemberLifecycleChecks(
        makeFacts({ findOrgAdmin }),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.removeMember(CALLER, MEMBERSHIP)).toEqual({
        ok: false,
        code: 'MEMBER_NOT_FOUND'
      })
      expect(isOrgAdmin).not.toHaveBeenCalled()
      expect(findOrgAdmin).not.toHaveBeenCalled()
    })

    it('fetches authz and admin ref concurrently against the resolved member', async () => {
      const member = makeMember()
      const findMembershipById = jest.fn(async () => member)
      const findOrgAdmin = jest.fn(async () => ({ adminUserId: ADMIN }))
      const isOrgAdmin = jest.fn(async () => true)
      const checks = createMemberLifecycleChecks(
        makeFacts({ findMembershipById, findOrgAdmin }),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.removeMember(CALLER, MEMBERSHIP)).toEqual({
        ok: true,
        member,
        adminUserId: ADMIN
      })
      expect(findMembershipById).toHaveBeenCalledWith(MEMBERSHIP)
      expect(isOrgAdmin).toHaveBeenCalledWith(CALLER, ORG)
      expect(findOrgAdmin).toHaveBeenCalledWith(ORG)
    })

    it('forwards a not-admin authz result through to the policy', async () => {
      const checks = createMemberLifecycleChecks(
        makeFacts({
          async findMembershipById() {
            return makeMember()
          },
          async findOrgAdmin() {
            return { adminUserId: ADMIN }
          }
        }),
        makeAuthz({
          async isOrgAdmin() {
            return false
          }
        })
      )
      expect(await checks.removeMember(CALLER, MEMBERSHIP)).toEqual({
        ok: false,
        code: 'ONLY_ADMIN_CAN_REMOVE_MEMBERS'
      })
    })

    it('surfaces ORGANIZATION_NOT_FOUND when findOrgAdmin returns null', async () => {
      const facts = makeFacts({
        async findMembershipById() {
          return makeMember()
        }
      })
      const authz = makeAuthz({
        async isOrgAdmin() {
          return true
        }
      })
      const checks = createMemberLifecycleChecks(facts, authz)
      expect(await checks.removeMember(ADMIN, MEMBERSHIP)).toEqual({
        ok: false,
        code: 'ORGANIZATION_NOT_FOUND'
      })
    })
  })

  describe('leaveOrganization', () => {
    it('fetches the three facts concurrently and returns the ok payload', async () => {
      const member = makeMember()
      const isOrgAdmin = jest.fn(async () => false)
      const findMembershipByUserAndOrg = jest.fn(async () => member)
      const findOrgAdmin = jest.fn(async () => ({ adminUserId: ADMIN }))
      const checks = createMemberLifecycleChecks(
        makeFacts({ findMembershipByUserAndOrg, findOrgAdmin }),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.leaveOrganization(USER, ORG)).toEqual({
        ok: true,
        member,
        adminUserId: ADMIN
      })
      expect(isOrgAdmin).toHaveBeenCalledWith(USER, ORG)
      expect(findMembershipByUserAndOrg).toHaveBeenCalledWith(USER, ORG)
      expect(findOrgAdmin).toHaveBeenCalledWith(ORG)
    })

    it('forwards an admin-caller into ADMIN_CANNOT_LEAVE', async () => {
      const checks = createMemberLifecycleChecks(
        makeFacts({
          async findMembershipByUserAndOrg() {
            return makeMember()
          },
          async findOrgAdmin() {
            return { adminUserId: ADMIN }
          }
        }),
        makeAuthz({
          async isOrgAdmin() {
            return true
          }
        })
      )
      expect(await checks.leaveOrganization(USER, ORG)).toEqual({
        ok: false,
        code: 'ADMIN_CANNOT_LEAVE'
      })
    })

    it('forwards a missing membership into NOT_MEMBER_OF_ORG', async () => {
      const checks = createMemberLifecycleChecks(
        makeFacts({
          async findOrgAdmin() {
            return { adminUserId: ADMIN }
          }
        }),
        makeAuthz({})
      )
      expect(await checks.leaveOrganization(USER, ORG)).toEqual({
        ok: false,
        code: 'NOT_MEMBER_OF_ORG'
      })
    })

    it('surfaces ORGANIZATION_NOT_FOUND when findOrgAdmin returns null', async () => {
      const facts = makeFacts({
        async findMembershipByUserAndOrg() {
          return makeMember()
        }
      })
      const authz = makeAuthz()
      const checks = createMemberLifecycleChecks(facts, authz)
      expect(await checks.leaveOrganization(USER, ORG)).toEqual({
        ok: false,
        code: 'ORGANIZATION_NOT_FOUND'
      })
    })
  })
})
