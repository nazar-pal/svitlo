import { buildMemberList } from '../build-member-list'

const makeGetUserInfo =
  (data: Record<string, { name: string; email: string }>) => (userId: string) =>
    data[userId] ?? { name: '', email: '' }

const USERS = {
  admin: { name: 'Alice Admin', email: 'alice@example.com' },
  bob: { name: 'Bob Builder', email: 'bob@example.com' },
  carol: { name: 'Carol Coder', email: 'carol@example.com' }
}

describe('buildMemberList', () => {
  it('puts admin first and marks isAdmin', () => {
    const result = buildMemberList({
      adminUserId: 'admin',
      members: [{ id: 'm1', userId: 'bob' }],
      invitations: [],
      currentUserId: 'bob',
      searchQuery: '',
      getUserInfo: makeGetUserInfo(USERS)
    })

    expect(result.people[0]).toEqual({
      userId: 'admin',
      info: USERS.admin,
      isAdmin: true,
      isYou: false
    })
    expect(result.people[1]).toMatchObject({
      userId: 'bob',
      memberId: 'm1',
      isAdmin: false,
      isYou: true
    })
  })

  it('skips the admin block when there is no admin', () => {
    const result = buildMemberList({
      adminUserId: undefined,
      members: [{ id: 'm1', userId: 'bob' }],
      invitations: [],
      currentUserId: 'bob',
      searchQuery: '',
      getUserInfo: makeGetUserInfo(USERS)
    })

    expect(result.people).toHaveLength(1)
    expect(result.people[0].userId).toBe('bob')
  })

  it('deduplicates the admin when they also appear in members', () => {
    const result = buildMemberList({
      adminUserId: 'admin',
      members: [
        { id: 'm-admin', userId: 'admin' },
        { id: 'm-bob', userId: 'bob' }
      ],
      invitations: [],
      currentUserId: 'admin',
      searchQuery: '',
      getUserInfo: makeGetUserInfo(USERS)
    })

    expect(result.people).toHaveLength(2)
    expect(result.people.filter(p => p.userId === 'admin')).toHaveLength(1)
  })

  it('flags isYou on the admin path', () => {
    const result = buildMemberList({
      adminUserId: 'admin',
      members: [],
      invitations: [],
      currentUserId: 'admin',
      searchQuery: '',
      getUserInfo: makeGetUserInfo(USERS)
    })

    expect(result.people[0].isYou).toBe(true)
  })

  it('filters people by name (case-insensitive)', () => {
    const result = buildMemberList({
      adminUserId: 'admin',
      members: [
        { id: 'm1', userId: 'bob' },
        { id: 'm2', userId: 'carol' }
      ],
      invitations: [],
      currentUserId: 'admin',
      searchQuery: 'CAROL',
      getUserInfo: makeGetUserInfo(USERS)
    })

    expect(result.filteredPeople).toHaveLength(1)
    expect(result.filteredPeople[0].userId).toBe('carol')
  })

  it('filters people by email (case-insensitive)', () => {
    const result = buildMemberList({
      adminUserId: 'admin',
      members: [
        { id: 'm1', userId: 'bob' },
        { id: 'm2', userId: 'carol' }
      ],
      invitations: [],
      currentUserId: 'admin',
      searchQuery: 'BOB@example',
      getUserInfo: makeGetUserInfo(USERS)
    })

    expect(result.filteredPeople).toHaveLength(1)
    expect(result.filteredPeople[0].userId).toBe('bob')
  })

  it('filters invitations by inviteeEmail (case-insensitive)', () => {
    const result = buildMemberList({
      adminUserId: 'admin',
      members: [],
      invitations: [
        { id: 'i1', inviteeEmail: 'someone@test.com', inviteeUserId: null },
        { id: 'i2', inviteeEmail: 'other@test.com', inviteeUserId: null }
      ],
      currentUserId: 'admin',
      searchQuery: 'SOMEONE',
      getUserInfo: makeGetUserInfo(USERS)
    })

    expect(result.filteredInvitations).toHaveLength(1)
    expect(result.filteredInvitations[0].id).toBe('i1')
  })

  it('returns everything unfiltered when query is empty', () => {
    const result = buildMemberList({
      adminUserId: 'admin',
      members: [{ id: 'm1', userId: 'bob' }],
      invitations: [
        { id: 'i1', inviteeEmail: 'x@test.com', inviteeUserId: null }
      ],
      currentUserId: 'admin',
      searchQuery: '',
      getUserInfo: makeGetUserInfo(USERS)
    })

    expect(result.filteredPeople).toHaveLength(2)
    expect(result.filteredInvitations).toHaveLength(1)
    expect(result.hasNoResults).toBe(false)
  })

  it('hasNoResults is true only when query is non-empty and both lists are empty', () => {
    const empty = buildMemberList({
      adminUserId: 'admin',
      members: [{ id: 'm1', userId: 'bob' }],
      invitations: [
        { id: 'i1', inviteeEmail: 'x@test.com', inviteeUserId: null }
      ],
      currentUserId: 'admin',
      searchQuery: 'nomatches',
      getUserInfo: makeGetUserInfo(USERS)
    })
    expect(empty.hasNoResults).toBe(true)

    const partialMatch = buildMemberList({
      adminUserId: 'admin',
      members: [{ id: 'm1', userId: 'bob' }],
      invitations: [
        { id: 'i1', inviteeEmail: 'x@test.com', inviteeUserId: null }
      ],
      currentUserId: 'admin',
      searchQuery: 'bob',
      getUserInfo: makeGetUserInfo(USERS)
    })
    expect(partialMatch.hasNoResults).toBe(false)

    const unfiltered = buildMemberList({
      adminUserId: 'admin',
      members: [],
      invitations: [],
      currentUserId: 'admin',
      searchQuery: '',
      getUserInfo: makeGetUserInfo(USERS)
    })
    expect(unfiltered.hasNoResults).toBe(false)
  })
})
