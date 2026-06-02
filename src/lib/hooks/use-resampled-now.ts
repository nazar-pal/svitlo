import { useMemo } from 'react'

// Returns a `new Date()` whose reference is stable until `key` changes.
// Resampling `now` only when the keyed value (e.g. the edited stop time)
// changes keeps UX-only policy gates like `END_TIME_IN_FUTURE` from
// flickering across frames near the boundary; the mutation re-checks with
// `c.now()` at submit, so this clock drives the gate's display state only.
export function useResampledNow(key: string): Date {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => new Date(), [key])
}
