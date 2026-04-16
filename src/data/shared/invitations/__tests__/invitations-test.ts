import {
  acceptInvitationPolicy,
  cancelInvitationPolicy,
  createInvitationPolicy,
  declineInvitationPolicy,
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
