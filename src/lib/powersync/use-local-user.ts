import { getUser } from '@/data/client/queries'
import { useDrizzleQuery } from '../hooks/use-drizzle-query'
import { usePowerSync } from './context'

export function useLocalUser() {
  const { userId, isReady } = usePowerSync()

  const { data } = useDrizzleQuery(
    isReady && userId ? getUser({ userId }) : undefined
  )

  return data[0] || null
}
