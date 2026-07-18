import { useRef } from 'react'

// Returns a `new Date()` whose reference is stable until `key` changes.
// Resampling `now` only when the keyed value (e.g. the edited stop time)
// changes keeps UX-only policy gates like `END_TIME_IN_FUTURE` from
// flickering across frames near the boundary; the mutation re-checks with
// `c.now()` at submit, so this clock drives the gate's display state only.
//
// A keyed ref rather than `useMemo`: memo caches are a performance hint
// React may discard (which would silently resample), while the ref makes
// the stability an actual guarantee.
export function useResampledNow(key: string): Date {
  const ref = useRef<{ key: string; now: Date } | null>(null)
  if (ref.current?.key !== key) ref.current = { key, now: new Date() }
  return ref.current.now
}
