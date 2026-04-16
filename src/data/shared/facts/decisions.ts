import type { Decision, FactPlanEntry } from './port'

// Identity helper with inference anchors. Domains declare decisions via
// this so the `Args`, `Facts`, and `Result` type params are captured at
// declaration-site for the proxy facades downstream.
export function defineDecision<Args, Facts, Result>(def: {
  id: string
  plan: readonly FactPlanEntry<Args, Partial<Facts>, unknown>[]
  rule: (args: Args, facts: Facts) => Result
}): Decision<Args, Facts, Result> {
  return def
}

// Curried helper for plan entries: binds `Args` + `Facts` once so
// individual plan entries don't re-state those generics. `Input` is still
// inferred from the callback return. Adopt per-decision as:
//
//   const plan = factPlanFor<StartSessionArgs, StartSessionFacts>()
//   // then: plan('alias', 'key', (a, f) => ...)
export function factPlanFor<Args, Facts>() {
  return <Input>(
    alias: keyof Facts & string,
    key: string,
    input: (args: Args, facts: Partial<Facts>) => Input | null
  ): FactPlanEntry<Args, Partial<Facts>, Input> => ({ alias, key, input })
}
