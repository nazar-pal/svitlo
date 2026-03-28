import { useEffect, useState } from 'react'

import { differenceInMilliseconds, parseISO } from 'date-fns'

import { formatDuration } from '@/lib/utils/time'

interface ElapsedTimer {
  elapsedTimeStr: string
  elapsedHours: number
}

/**
 * Returns a live-updating elapsed time string and fractional hours from a start
 * timestamp. Updates every second while startedAt is non-null.
 */
export function useElapsedTimer(startedAt: string | null): ElapsedTimer {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!startedAt) return
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  if (!startedAt) return { elapsedTimeStr: '0:00:00', elapsedHours: 0 }

  const elapsed = Math.max(
    0,
    differenceInMilliseconds(now, parseISO(startedAt))
  )
  return {
    elapsedTimeStr: formatDuration(elapsed),
    elapsedHours: elapsed / 3_600_000
  }
}
