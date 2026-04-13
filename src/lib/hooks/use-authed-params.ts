import { useLocalSearchParams } from 'expo-router'

import { useLocalUser } from '@/lib/powersync'

interface AuthedParams<K extends string> {
  userId: string
  params: Record<K, string>
}

export function useAuthedParams<const K extends string>(
  keys: readonly K[]
): AuthedParams<K> | null {
  const params = useLocalSearchParams<Record<K, string>>()
  const localUser = useLocalUser()
  if (!localUser) return null
  for (const key of keys) if (!params[key]) return null
  return { userId: localUser.id, params: params as Record<K, string> }
}
