import { useEffect, useState } from 'react'

import { differenceInMilliseconds } from 'date-fns'

import { formatDuration } from '@/lib/utils/time'

export interface RestCountdown {
  remainingMs: number
  remainingFormatted: string
  progress: number
}

/**
 * Returns a live countdown for generator rest period.
 * `progress` is the fraction of rest completed (0 -> 1).
 */
export function useRestCountdown(
  restEndsAt: Date | null,
  requiredRestHours: number
): RestCountdown {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!restEndsAt) return
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [restEndsAt])

  if (!restEndsAt)
    return { remainingMs: 0, remainingFormatted: '0:00:00', progress: 1 }

  const remainingMs = Math.max(0, differenceInMilliseconds(restEndsAt, now))
  const totalMs = requiredRestHours * 3_600_000
  const elapsedMs = totalMs - remainingMs
  const progress = totalMs > 0 ? Math.min(elapsedMs / totalMs, 1) : 1

  return {
    remainingMs,
    remainingFormatted: formatDuration(remainingMs),
    progress
  }
}
