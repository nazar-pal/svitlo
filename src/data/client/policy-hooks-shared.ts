// Shared result shape for reactive policy hooks (`useCanX`). All domain
// `policy-hooks.ts` files import from here so UI code sees one type.

import type { PolicyResult } from '@/data/shared/policy-result'

export type PolicyView =
  | { status: 'loading' }
  | ({ status: 'ready' } & PolicyResult)

export const LOADING: PolicyView = { status: 'loading' }

export function isPolicyAllowed(view: PolicyView): boolean {
  return view.status === 'ready' && view.ok
}
