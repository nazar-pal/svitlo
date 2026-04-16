import { leaveOrganizationPolicy, removeMemberPolicy, type MemberRef } from '..'

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

  it('resolves ok when caller is admin and member exists', () => {
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

  it('resolves ok when a non-admin member leaves their org', () => {
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
