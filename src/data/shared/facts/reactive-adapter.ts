import type { DrizzleCompilable } from '@/lib/hooks/use-drizzle-query'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import type { PolicyResult } from '@/data/shared/policy-result'

import { LOADING, type Decision, type PolicyView } from './port'

// Reactive resolver contract. Each entry exposes a Drizzle builder that
// `useDrizzleQuery` can subscribe to, plus a projector that maps the
// emitted rows back to the fact shape the decision's rule expects.
export interface ReactiveResolverEntry {
  build: (input: unknown) => DrizzleCompilable<unknown>
  project: (rows: readonly unknown[]) => unknown
}

export type ReactiveRegistry = Record<string, ReactiveResolverEntry>

// React hooks must run in a stable order across renders, which means the
// decision's plan length determines the hook count up front. The `decision`
// argument must therefore be render-constant — swapping in a decision with
// a different plan length mid-lifetime breaks hook order. Every entry
// calls `useDrizzleQuery` unconditionally; entries whose `input()` is
// null pass `undefined` so the hook returns its no-op result while
// preserving the hook slot.
//
// `args: Args | null` preserves the "gate this hook" ergonomic of the
// hand-written `useCanX(userId | null, entityId | null)` hooks it replaces:
// null forces LOADING for the whole decision without breaking hook order
// (every plan entry still calls `useDrizzleQuery(undefined)`).
//
// `Result extends PolicyResult` keeps authz decisions (whose
// `NOT_AUTHORIZED` code is intentionally outside the user-facing
// `ParamFreeMutationErrorCode` union) out of this facade at compile time —
// they run server-side only via `runDecisionAsync`.
export function useDecision<Args, Facts, Result extends PolicyResult>(
  decision: Decision<Args, Facts, Result>,
  args: Args | null,
  registry: ReactiveRegistry
): PolicyView {
  const facts: Record<string, unknown> = {}
  let isLoading = false

  for (const entry of decision.plan) {
    const resolver = registry[entry.key]
    if (!resolver)
      throw new Error(`no reactive resolver registered for key "${entry.key}"`)

    const input =
      args === null ? null : entry.input(args, facts as Partial<Facts>)
    const builder = input === null ? undefined : resolver.build(input)

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { data, isLoading: loading } = useDrizzleQuery(builder)

    if (input === null) continue
    if (loading) {
      isLoading = true
      continue
    }
    facts[entry.alias] = resolver.project(data)
  }

  if (isLoading || args === null) return LOADING

  const result = decision.rule(args, facts as Facts)
  if (result.ok) return { status: 'ready', ok: true }
  return { status: 'ready', ok: false, code: result.code }
}
