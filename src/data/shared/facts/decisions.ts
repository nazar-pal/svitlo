import type { FactInput, FactKey, FactOf } from './contracts'
import type { Decision, FactPlanEntry } from './port'

// Identity helper with inference anchors. Domains declare decisions via
// this so the `Args`, `Facts`, and `Result` type params are captured at
// declaration-site for the proxy facades downstream.
export function defineDecision<Args, Facts, Result>(def: {
  plan: readonly FactPlanEntry<Args, Partial<Facts>, unknown>[]
  rule: (args: Args, facts: Facts) => Result
}): Decision<Args, Facts, Result> {
  return def
}

// Curried helper for plan entries: binds `Args` + `Facts` once so
// individual plan entries don't re-state those generics. The key is
// generic, so `input` must return that key's contract input and `alias` is
// constrained to the fact fields whose declared type can hold what the key
// produces. That check is shape-only: fields of the same type stay
// interchangeable, so it will not catch transposing two `boolean` facts.
// Adopt per-decision as:
//
//   const plan = factPlanFor<StartSessionArgs, StartSessionFacts>()
//   // then: plan('alias', 'key', (a, f) => ...)
export function factPlanFor<Args, Facts>() {
  return <K extends FactKey>(
    alias: {
      [A in keyof Facts & string]: FactOf<K> extends Facts[A] ? A : never
    }[keyof Facts & string],
    key: K,
    input: (args: Args, facts: Partial<Facts>) => FactInput<K> | null
  ): FactPlanEntry<Args, Partial<Facts>, FactInput<K>> => ({
    alias,
    key,
    input
  })
}
