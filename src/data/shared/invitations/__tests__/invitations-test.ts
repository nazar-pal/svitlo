import type { AuthzChecks } from '@/data/shared/authz'

import {
  acceptInvitationPolicy,
  cancelInvitationPolicy,
  createInvitationLifecycleChecks,
  createInvitationPolicy,
  declineInvitationPolicy,
  type InvitationFactsProvider,
  type InvitationRef
} from '..'

const ORG = 'org-1'
const EMAIL = 'invitee@test.com'

function makeInvitation(overrides: Partial<InvitationRef> = {}): InvitationRef {
  return {
    organizationId: ORG,
    inviteeEmail: EMAIL,
    ...overrides
  }
}

describe('createInvitationPolicy', () => {
  it('rejects when the caller is not the org admin', () => {
    expect(
      createInvitationPolicy({ isOrgAdmin: false, alreadyInvited: false })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_INVITE' })
  })

  it('rejects when a duplicate invitation already exists', () => {
    expect(
      createInvitationPolicy({ isOrgAdmin: true, alreadyInvited: true })
    ).toEqual({ ok: false, code: 'INVITATION_ALREADY_SENT' })
  })

  it('accepts the happy path', () => {
    expect(
      createInvitationPolicy({ isOrgAdmin: true, alreadyInvited: false })
    ).toEqual({ ok: true })
  })
})

describe('acceptInvitationPolicy', () => {
  it('rejects when the invitation is missing', () => {
    expect(
      acceptInvitationPolicy({
        invitation: null,
        userEmail: EMAIL,
        alreadyMember: false
      })
    ).toEqual({ ok: false, code: 'INVITATION_NOT_FOUND' })
  })

  it('rejects when the caller email does not match the invitee email', () => {
    expect(
      acceptInvitationPolicy({
        invitation: makeInvitation(),
        userEmail: 'other@test.com',
        alreadyMember: false
      })
    ).toEqual({ ok: false, code: 'INVITATION_NOT_FOR_YOU' })
  })

  it('matches emails case-insensitively', () => {
    expect(
      acceptInvitationPolicy({
        invitation: makeInvitation({ inviteeEmail: 'Test@Example.com' }),
        userEmail: 'test@example.com',
        alreadyMember: false
      })
    ).toEqual({
      ok: true,
      invitation: makeInvitation({ inviteeEmail: 'Test@Example.com' })
    })
  })

  it('rejects when the caller is already a member', () => {
    expect(
      acceptInvitationPolicy({
        invitation: makeInvitation(),
        userEmail: EMAIL,
        alreadyMember: true
      })
    ).toEqual({ ok: false, code: 'ALREADY_MEMBER' })
  })

  it('surfaces the invitation on success', () => {
    const invitation = makeInvitation()
    expect(
      acceptInvitationPolicy({
        invitation,
        userEmail: EMAIL,
        alreadyMember: false
      })
    ).toEqual({ ok: true, invitation })
  })
})

describe('declineInvitationPolicy', () => {
  it('rejects when the invitation is missing', () => {
    expect(
      declineInvitationPolicy({ invitation: null, userEmail: EMAIL })
    ).toEqual({ ok: false, code: 'INVITATION_NOT_FOUND' })
  })

  it('rejects when the caller email does not match', () => {
    expect(
      declineInvitationPolicy({
        invitation: makeInvitation(),
        userEmail: 'other@test.com'
      })
    ).toEqual({ ok: false, code: 'INVITATION_NOT_FOR_YOU' })
  })

  it('matches emails case-insensitively', () => {
    expect(
      declineInvitationPolicy({
        invitation: makeInvitation({ inviteeEmail: 'Test@Example.com' }),
        userEmail: 'test@example.com'
      })
    ).toEqual({ ok: true })
  })

  it('accepts the happy path', () => {
    expect(
      declineInvitationPolicy({
        invitation: makeInvitation(),
        userEmail: EMAIL
      })
    ).toEqual({ ok: true })
  })
})

describe('cancelInvitationPolicy', () => {
  it('rejects when the invitation is missing', () => {
    expect(
      cancelInvitationPolicy({
        invitation: null,
        isCallerOrgAdmin: true
      })
    ).toEqual({ ok: false, code: 'INVITATION_NOT_FOUND' })
  })

  it('rejects when the caller is not the org admin', () => {
    expect(
      cancelInvitationPolicy({
        invitation: makeInvitation(),
        isCallerOrgAdmin: false
      })
    ).toEqual({ ok: false, code: 'ONLY_ADMIN_CAN_CANCEL_INVITATIONS' })
  })

  it('accepts the happy path', () => {
    expect(
      cancelInvitationPolicy({
        invitation: makeInvitation(),
        isCallerOrgAdmin: true
      })
    ).toEqual({ ok: true })
  })
})

// Orchestrator-level tests: only behaviors unique to the wiring layer
// (short-circuits, concurrency, arg forwarding). Pure policy-branch
// coverage lives in the policy suites above.

const CALLER = 'caller-1'
const USER = 'user-1'
const INVITATION = 'invitation-1'

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
  describe('acceptInvitation', () => {
    it('skips the hasMembership fact when the invitation is missing', async () => {
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

    it('forwards facts (invitation + membership) to acceptInvitationPolicy on the happy path', async () => {
      const hasMembership = jest.fn(async () => false)
      const findInvitationById = jest.fn(async () => INVITATION_REF)
      const checks = createInvitationLifecycleChecks(
        makeFacts({ findInvitationById, hasMembership }),
        makeAuthz({})
      )
      expect(await checks.acceptInvitation(USER, EMAIL, INVITATION)).toEqual({
        ok: true,
        invitation: INVITATION_REF
      })
      expect(findInvitationById).toHaveBeenCalledWith(INVITATION)
      expect(hasMembership).toHaveBeenCalledWith(USER, ORG)
    })
  })

  describe('createInvitation', () => {
    it('fetches authz + existing invitation concurrently via Promise.all', async () => {
      // Both calls must be in-flight at the same time. If the orchestrator
      // awaited one before starting the other, the second spy would never
      // be called while the first was still pending, and the resolver
      // below (which only resolves once both have started) would deadlock.
      let authzStarted = false
      let factStarted = false
      let resolveAuthz: (value: boolean) => void = () => {}
      let resolveFact: (value: InvitationRef | null) => void = () => {}
      const authzPromise = new Promise<boolean>(resolve => {
        resolveAuthz = resolve
      })
      const factPromise = new Promise<InvitationRef | null>(resolve => {
        resolveFact = resolve
      })

      const tryResolveBoth = () => {
        if (authzStarted && factStarted) {
          resolveAuthz(true)
          resolveFact(null)
        }
      }

      const isOrgAdmin = jest.fn(() => {
        authzStarted = true
        tryResolveBoth()
        return authzPromise
      })
      const findInvitationByOrgAndEmail = jest.fn(() => {
        factStarted = true
        tryResolveBoth()
        return factPromise
      })

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

    it('forwards facts to createInvitationPolicy on the happy path', async () => {
      const checks = createInvitationLifecycleChecks(
        makeFacts({
          async findInvitationByOrgAndEmail() {
            return null
          }
        }),
        makeAuthz({
          async isOrgAdmin() {
            return true
          }
        })
      )
      expect(await checks.createInvitation(CALLER, ORG, EMAIL)).toEqual({
        ok: true
      })
    })
  })

  describe('cancelInvitation', () => {
    it('skips the authz check when the invitation returns null', async () => {
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

    it("checks authz against the invitation's own organization", async () => {
      const invitationOrg = 'org-from-invitation'
      const isOrgAdmin = jest.fn(async () => true)
      const checks = createInvitationLifecycleChecks(
        makeFacts({
          async findInvitationById() {
            return { organizationId: invitationOrg, inviteeEmail: EMAIL }
          }
        }),
        makeAuthz({ isOrgAdmin })
      )
      expect(await checks.cancelInvitation(CALLER, INVITATION)).toEqual({
        ok: true
      })
      // Authz is scoped to the invitation's org — no caller-supplied orgId
      // is accepted by the orchestrator API.
      expect(isOrgAdmin).toHaveBeenCalledWith(CALLER, invitationOrg)
    })
  })
})
