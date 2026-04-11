import { useEffect, useState } from 'react'

import {
  computeHomeReadiness,
  type HomeReadinessInput
} from './compute-home-readiness'

// When selectedOrgId first appears the generators query switches from a
// no-op to a real SQLite query, but the hook still returns the old empty
// result for a few renders. This timer lets that query settle; if
// generators arrive first, the effect re-runs and clears the timer.
const HOME_SETTLE_DELAY_MS = 150

export function useHomeReadiness(input: HomeReadinessInput): boolean {
  const readiness = computeHomeReadiness(input)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready) return
    if (
      readiness.kind === 'ready-generators-loaded' ||
      readiness.kind === 'ready-no-orgs'
    ) {
      setReady(true)
      return
    }
    if (readiness.kind === 'waiting-for-generators-settle') {
      const timer = setTimeout(() => setReady(true), HOME_SETTLE_DELAY_MS)
      return () => clearTimeout(timer)
    }
  }, [readiness.kind, ready])

  return ready
}
