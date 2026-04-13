import type { TFunction } from 'i18next'

export interface InvitationDetails {
  id: string
  orgName: string
  inviterName: string
}

interface PendingInvitation {
  id: string
  organizationId: string
  invitedByUserId: string
}

interface OrgRow {
  id: string
  name: string
}

interface UserRow {
  id: string
  name: string | null
}

export function resolveInvitationDetails(
  invitation: PendingInvitation,
  orgs: readonly OrgRow[],
  users: readonly UserRow[],
  t: TFunction
): InvitationDetails {
  const unknown = t('common.unknown')
  return {
    id: invitation.id,
    orgName:
      orgs.find(o => o.id === invitation.organizationId)?.name ?? unknown,
    inviterName:
      users.find(u => u.id === invitation.invitedByUserId)?.name ?? unknown
  }
}
