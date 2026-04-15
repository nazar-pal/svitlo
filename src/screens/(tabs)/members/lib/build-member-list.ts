export interface MemberListPerson {
  userId: string
  memberId?: string
  info: { name: string; email: string }
  isAdmin: boolean
  isYou: boolean
}

export interface MemberListMember {
  id: string
  userId: string
}

export interface MemberListInvitation {
  id: string
  inviteeEmail: string
  inviteeUserId: string | null
}

export interface BuildMemberListInput {
  adminUserId: string | undefined
  members: MemberListMember[]
  invitations: MemberListInvitation[]
  currentUserId: string
  searchQuery: string
  getUserInfo: (userId: string) => { name: string; email: string }
}

export interface BuildMemberListResult {
  people: MemberListPerson[]
  filteredPeople: MemberListPerson[]
  filteredInvitations: MemberListInvitation[]
  hasNoResults: boolean
}

export function buildMemberList(
  input: BuildMemberListInput
): BuildMemberListResult {
  const {
    adminUserId,
    members,
    invitations,
    currentUserId,
    searchQuery,
    getUserInfo
  } = input

  const people: MemberListPerson[] = []

  if (adminUserId) {
    people.push({
      userId: adminUserId,
      info: getUserInfo(adminUserId),
      isAdmin: true,
      isYou: adminUserId === currentUserId
    })
  }

  for (const m of members) {
    if (m.userId === adminUserId) continue
    people.push({
      userId: m.userId,
      memberId: m.id,
      info: getUserInfo(m.userId),
      isAdmin: false,
      isYou: m.userId === currentUserId
    })
  }

  const query = searchQuery.toLowerCase()

  const filteredPeople = query
    ? people.filter(
        ({ info }) =>
          info.name.toLowerCase().includes(query) ||
          info.email.toLowerCase().includes(query)
      )
    : people

  const filteredInvitations = query
    ? invitations.filter(inv => inv.inviteeEmail.toLowerCase().includes(query))
    : invitations

  const hasNoResults =
    query.length > 0 &&
    filteredPeople.length === 0 &&
    filteredInvitations.length === 0

  return { people, filteredPeople, filteredInvitations, hasNoResults }
}
