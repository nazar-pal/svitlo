import { getInvitationsByEmail } from '@/data/client/queries'
import { useLocalUser } from '@/lib/powersync'
import { useDrizzleQuery } from './use-drizzle-query'

export function usePendingInvitations() {
  const localUser = useLocalUser()
  const normalizedEmail = (localUser?.email ?? '').toLowerCase()

  const { data } = useDrizzleQuery(
    normalizedEmail ? getInvitationsByEmail(normalizedEmail) : undefined
  )

  return data
}
