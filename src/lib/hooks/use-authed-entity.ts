import type { AdditionalOptions } from '@powersync/react-native'

import { useAuthedParams } from './use-authed-params'
import { type DrizzleCompilable, useDrizzleQuery } from './use-drizzle-query'

interface AuthedEntity<T> {
  userId: string
  entity: T
}

export function useAuthedEntity<const K extends string, T>(
  keys: readonly K[],
  load: (params: Record<K, string>) => DrizzleCompilable<T>,
  options?: AdditionalOptions
): AuthedEntity<T> | null {
  const ctx = useAuthedParams(keys)
  const { data } = useDrizzleQuery<T>(
    ctx ? load(ctx.params) : undefined,
    options
  )
  const entity = data[0]
  if (!ctx || !entity) return null
  return { userId: ctx.userId, entity }
}
