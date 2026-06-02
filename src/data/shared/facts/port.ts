import type { ParamFreeMutationErrorCode } from '@/data/shared/errors'

// Unified port for the "facts + policy + lifecycle-checks" cluster. Replaces
// the per-domain FactsProvider interfaces by declaring facts via their
// resolver key in a side-specific registry. Decisions describe (args → facts
// → result); adapters interpret the same decision over an async or reactive
// registry.

// Resolver keys are plain strings. Each side's registry binds them to a
// concrete fetch function (PG query on the server, SQLite builder on the
// client). Decisions reference them via `key` here so the same spec drives
// both sides.
export interface FactPlanEntry<Args, FactsSoFar, Input> {
  readonly alias: string
  readonly key: string
  readonly input: (args: Args, facts: FactsSoFar) => Input | null
}

// A decision is a pure plan: ordered fact lookups + a rule that runs against
// the resolved facts. The plan determines both async and reactive execution
// order — reactive also depends on it to keep React hook order stable.
export interface Decision<Args, Facts, Result> {
  readonly id: string
  readonly plan: readonly FactPlanEntry<Args, Partial<Facts>, unknown>[]
  readonly rule: (args: Args, facts: Facts) => Result
}

// Reactive outcome. UI only cares about ok/code and the loading gate, so
// facts are projected away — keeps `PolicyView` equality with the
// pre-refactor shape and avoids leaking server-only fact payloads into the
// client-bundle subscription layer.
export type PolicyView<Code extends string = ParamFreeMutationErrorCode> =
  | { status: 'loading' }
  | { status: 'ready'; ok: true }
  | { status: 'ready'; ok: false; code: Code }

// Re-export so downstream files can reach the narrow code union without
// importing `@/data/shared/errors` directly.
export type { ParamFreeMutationErrorCode }

export const LOADING: PolicyView = { status: 'loading' }

// Convenience narrowing.
export function isPolicyAllowed(view: PolicyView): boolean {
  return view.status === 'ready' && view.ok
}
