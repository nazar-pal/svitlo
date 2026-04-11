import type { AuthzChecks } from '@/data/shared/authz'

import { createMemberLifecycleChecks } from '../checks'
import type { MemberFactsProvider, MemberRef, OrgAdminRef } from '../facts'

// Glue-level tests only: verify that the orchestrator fetches the right
// facts and forwards them to the right policy function. Full enumeration
// of policy branches lives in `policy-test.ts`; duplicating it here would
// just add layers to the same assertions against the same error codes.

const CALLER = 'caller-1'
const USER = 'user-1'
const ADMIN = 'admin-1'
const ORG = 'org-1'
const MEMBERSHIP = 'membership-1'

const MEMBER: MemberRef = {
  id: MEMBERSHIP,
  organizationId: ORG,
  userId: USER
}

const ADMIN_REF: OrgAdminRef = { adminUserId: ADMIN }

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

describe('createMemberLifecycleChecks', () => {
  describe('removeMember', () => {
    it('short-circuits MEMBER_NOT_FOUND without calling authz or findOrgAdmin', async () => {
      const isOrgAdmin = jest.fn(async () => true)
      const findOrgAdmin = jest.fn(async () => ADMIN_REF)
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

    it('fetches authz and admin ref against the resolved member and returns the ok payload', async () => {
      const findMembershipById = jest.fn(async () => MEMBER)
      const findOrgAdmin = jest.fn(async () => ADMIN_REF)
      const isOrgAdmin = jest.fn(async () => true)
      const checks = createMemberLifecycleChecks(
        makeFacts({ findMembershipById, findOrgAdmin }),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.removeMember(CALLER, MEMBERSHIP)).toEqual({
        ok: true,
        member: MEMBER,
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
            return MEMBER
          },
          async findOrgAdmin() {
            return ADMIN_REF
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

    it('forwards a missing org admin through to the policy as ORGANIZATION_NOT_FOUND', async () => {
      const checks = createMemberLifecycleChecks(
        makeFacts({
          async findMembershipById() {
            return MEMBER
          },
          async findOrgAdmin() {
            return null
          }
        }),
        makeAuthz({
          async isOrgAdmin() {
            return true
          }
        })
      )
      expect(await checks.removeMember(CALLER, MEMBERSHIP)).toEqual({
        ok: false,
        code: 'ORGANIZATION_NOT_FOUND'
      })
    })
  })

  describe('leaveOrganization', () => {
    it('fetches the three facts concurrently and returns the ok payload', async () => {
      const isOrgAdmin = jest.fn(async () => false)
      const findMembershipByUserAndOrg = jest.fn(async () => MEMBER)
      const findOrgAdmin = jest.fn(async () => ADMIN_REF)
      const checks = createMemberLifecycleChecks(
        makeFacts({ findMembershipByUserAndOrg, findOrgAdmin }),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.leaveOrganization(USER, ORG)).toEqual({
        ok: true,
        member: MEMBER,
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
            return MEMBER
          },
          async findOrgAdmin() {
            return ADMIN_REF
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
            return ADMIN_REF
          }
        }),
        makeAuthz({})
      )
      expect(await checks.leaveOrganization(USER, ORG)).toEqual({
        ok: false,
        code: 'NOT_MEMBER_OF_ORG'
      })
    })

    it('forwards a missing org into ORGANIZATION_NOT_FOUND', async () => {
      const checks = createMemberLifecycleChecks(
        makeFacts({
          async findMembershipByUserAndOrg() {
            return MEMBER
          }
        }),
        makeAuthz({})
      )
      expect(await checks.leaveOrganization(USER, ORG)).toEqual({
        ok: false,
        code: 'ORGANIZATION_NOT_FOUND'
      })
    })
  })
})
