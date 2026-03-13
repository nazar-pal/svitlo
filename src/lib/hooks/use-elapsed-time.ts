import { useEffect, useState } from 'react'

import {
  differenceInMilliseconds,
  intervalToDuration,
  parseISO
} from 'date-fns'

/**
 * Returns live fractional hours elapsed since startedAt.
 * Updates every 60 seconds — sufficient for a progress bar.
 */
export function useElapsedHours(startedAt: string | null): number {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [startedAt])

  if (!startedAt) return 0
  return (
    Math.max(0, differenceInMilliseconds(now, parseISO(startedAt))) / 3_600_000
  )
}

/**
 * Returns a live-updating formatted elapsed time string from a start timestamp.
 * Updates every second while the component is mounted.
 */
export function useElapsedTime(startedAt: string | null): string {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!startedAt) return
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  if (!startedAt) return '0:00:00'

  const elapsed = Math.max(
    0,
    differenceInMilliseconds(now, parseISO(startedAt))
  )
  return formatDuration(elapsed)
}

export function formatDuration(ms: number): string {
  const {
    hours = 0,
    minutes = 0,
    seconds = 0
  } = intervalToDuration({
    start: 0,
    end: ms
  })
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 10) return `${hours.toFixed(1)}h`
  return `${Math.round(hours)}h`
}
