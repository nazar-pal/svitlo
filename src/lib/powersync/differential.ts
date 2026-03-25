import type { DifferentialHookOptions } from '@powersync/react/lib/hooks/watched/watch-types'

export function differential<
  T extends { id: string }
>(): DifferentialHookOptions<T> {
  return {
    rowComparator: {
      keyBy: (row: T) => row.id,
      compareBy: (row: T) => JSON.stringify(row)
    }
  }
}
