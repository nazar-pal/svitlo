import {
  getAllOrganizations,
  getAllUsers,
  getInvitationsByEmail
} from '@/data/client/queries'
import { useTranslation } from '@/lib/i18n'
import { useLocalUser } from '@/lib/powersync'
import { useDrizzleQuery } from './use-drizzle-query'

export interface InvitationDetails {
  id: string
  orgName: string
  inviterName: string
}

export function usePendingInvitations(): InvitationDetails[] {
  const localUser = useLocalUser()
  const { t } = useTranslation()
  const normalizedEmail = (localUser?.email ?? '').toLowerCase()

  const { data: invitations } = useDrizzleQuery(
    normalizedEmail ? getInvitationsByEmail(normalizedEmail) : undefined
  )
  const { data: orgs } = useDrizzleQuery(getAllOrganizations())
  const { data: users } = useDrizzleQuery(getAllUsers())

  const unknown = t('common.unknown')
  return invitations.map(inv => ({
    id: inv.id,
    orgName: orgs.find(o => o.id === inv.organizationId)?.name ?? unknown,
    inviterName: users.find(u => u.id === inv.invitedByUserId)?.name ?? unknown
  }))
}
