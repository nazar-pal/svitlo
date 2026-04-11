import type { AuthzChecks } from '@/data/shared/authz'

import { createInvitationLifecycleChecks } from '../checks'
import type { InvitationFactsProvider, InvitationRef } from '../facts'

// Glue-level tests only: verify that the orchestrator fetches the right
// facts and forwards them to the right policy function. Full enumeration
// of policy branches lives in `policy-test.ts`.

const CALLER = 'caller-1'
const USER = 'user-1'
const ORG = 'org-1'
const INVITATION = 'invitation-1'
const EMAIL = 'invitee@test.com'

const INVITATION_REF: InvitationRef = {
  organizationId: ORG,
  inviteeEmail: EMAIL
}

function makeFacts(
  overrides: Partial<InvitationFactsProvider> = {}
): InvitationFactsProvider {
  return {
    async findInvitationById() {
      return null
    },
    async findInvitationByOrgAndEmail() {
      return null
    },
    async hasMembership() {
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

describe('createInvitationLifecycleChecks', () => {
  describe('createInvitation', () => {
    it('fetches authz + existing invitation concurrently and forwards to the policy', async () => {
      const isOrgAdmin = jest.fn(async () => true)
      const findInvitationByOrgAndEmail = jest.fn(async () => null)
      const checks = createInvitationLifecycleChecks(
        makeFacts({ findInvitationByOrgAndEmail }),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.createInvitation(CALLER, ORG, EMAIL)).toEqual({
        ok: true
      })
      expect(isOrgAdmin).toHaveBeenCalledWith(CALLER, ORG)
      expect(findInvitationByOrgAndEmail).toHaveBeenCalledWith(ORG, EMAIL)
    })

    it('surfaces ONLY_ADMIN_CAN_INVITE when authz is false', async () => {
      const checks = createInvitationLifecycleChecks(
        makeFacts({}),
        makeAuthz({})
      )
      expect(await checks.createInvitation(CALLER, ORG, EMAIL)).toEqual({
        ok: false,
        code: 'ONLY_ADMIN_CAN_INVITE'
      })
    })

    it('surfaces INVITATION_ALREADY_SENT when a duplicate exists', async () => {
      const checks = createInvitationLifecycleChecks(
        makeFacts({
          async findInvitationByOrgAndEmail() {
            return INVITATION_REF
          }
        }),
        makeAuthz({
          async isOrgAdmin() {
            return true
          }
        })
      )
      expect(await checks.createInvitation(CALLER, ORG, EMAIL)).toEqual({
        ok: false,
        code: 'INVITATION_ALREADY_SENT'
      })
    })
  })

  describe('acceptInvitation', () => {
    it('short-circuits INVITATION_NOT_FOUND without checking membership', async () => {
      const hasMembership = jest.fn(async () => true)
      const checks = createInvitationLifecycleChecks(
        makeFacts({ hasMembership }),
        makeAuthz({})
      )
      expect(await checks.acceptInvitation(USER, EMAIL, INVITATION)).toEqual({
        ok: false,
        code: 'INVITATION_NOT_FOUND'
      })
      expect(hasMembership).not.toHaveBeenCalled()
    })

    it('uses the fetched invitation to decide whether to look up membership', async () => {
      const hasMembership = jest.fn(async () => false)
      const checks = createInvitationLifecycleChecks(
        makeFacts({
          async findInvitationById() {
            return INVITATION_REF
          },
          hasMembership
        }),
        makeAuthz({})
      )
      expect(await checks.acceptInvitation(USER, EMAIL, INVITATION)).toEqual({
        ok: true,
        invitation: INVITATION_REF
      })
      expect(hasMembership).toHaveBeenCalledWith(USER, ORG)
    })

    it('forwards ALREADY_MEMBER from the membership lookup', async () => {
      const checks = createInvitationLifecycleChecks(
        makeFacts({
          async findInvitationById() {
            return INVITATION_REF
          },
          async hasMembership() {
            return true
          }
        }),
        makeAuthz({})
      )
      expect(await checks.acceptInvitation(USER, EMAIL, INVITATION)).toEqual({
        ok: false,
        code: 'ALREADY_MEMBER'
      })
    })
  })

  describe('declineInvitation', () => {
    it('forwards INVITATION_NOT_FOUND when the row is missing', async () => {
      const checks = createInvitationLifecycleChecks(
        makeFacts({}),
        makeAuthz({})
      )
      expect(await checks.declineInvitation(EMAIL, INVITATION)).toEqual({
        ok: false,
        code: 'INVITATION_NOT_FOUND'
      })
    })

    it('forwards success when the email matches', async () => {
      const checks = createInvitationLifecycleChecks(
        makeFacts({
          async findInvitationById() {
            return INVITATION_REF
          }
        }),
        makeAuthz({})
      )
      expect(await checks.declineInvitation(EMAIL, INVITATION)).toEqual({
        ok: true
      })
    })
  })

  describe('cancelInvitation', () => {
    it('short-circuits INVITATION_NOT_FOUND without calling authz', async () => {
      const isOrgAdmin = jest.fn(async () => true)
      const checks = createInvitationLifecycleChecks(
        makeFacts({}),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.cancelInvitation(CALLER, INVITATION)).toEqual({
        ok: false,
        code: 'INVITATION_NOT_FOUND'
      })
      expect(isOrgAdmin).not.toHaveBeenCalled()
    })

    it('calls authz against the invitation org on success', async () => {
      const isOrgAdmin = jest.fn(async () => true)
      const checks = createInvitationLifecycleChecks(
        makeFacts({
          async findInvitationById() {
            return INVITATION_REF
          }
        }),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.cancelInvitation(CALLER, INVITATION)).toEqual({
        ok: true
      })
      expect(isOrgAdmin).toHaveBeenCalledWith(CALLER, ORG)
    })

    it('forwards ONLY_ADMIN_CAN_CANCEL_INVITATIONS when authz is false', async () => {
      const checks = createInvitationLifecycleChecks(
        makeFacts({
          async findInvitationById() {
            return INVITATION_REF
          }
        }),
        makeAuthz({})
      )
      expect(await checks.cancelInvitation(CALLER, INVITATION)).toEqual({
        ok: false,
        code: 'ONLY_ADMIN_CAN_CANCEL_INVITATIONS'
      })
    })
  })
})
