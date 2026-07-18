import type { Decision } from './port'

// Common "policy result" shape the rule may return. Rules may carry extra
// fields on the success branch (e.g. `acceptInvitationPolicy` returns
// `{ ok: true, invitation }`); those extras are forwarded through to the
// adapter's caller so mutation apply callbacks can read
// `checkOk.<field>` directly without re-deriving from `facts`. `code` is
// typed as `string` so authz decisions (which emit `NOT_AUTHORIZED`, a
// code intentionally outside the user-facing `ParamFreeMutationErrorCode`
// union) compose with the adapter uniformly.
export type RuleResult =
  | { ok: true; [k: string]: unknown }
  | { ok: false; code: string }

// Distributes over the rule-result union: ok branches contribute nothing,
// fail branches contribute their code literal(s).
type FailCode<T> = T extends { ok: false; code: infer C extends string }
  ? C
  : never

type OkBranch<T> = Extract<T, { ok: true }>

// Walks a decision's plan in declaration order, short-circuiting any entry
// whose `input()` returns null (leaves the fact as `undefined` in the
// merged facts object). Lookups run sequentially even when independent —
// a deliberate trade of a small latency cost (2-3 plan entries per
// decision) for one execution order shared with the reactive adapter,
// whose hook rules force sequential resolution anyway. After all lookups
// settle, invokes `rule`, spreads the rule's ok-branch so the caller keeps
// any extras it returned, and attaches `facts` on both branches so server
// handlers can do defence-in-depth without a second round trip. Because
// `facts` is attached after the spread, a rule ok-branch must not carry a
// field named `facts` of its own.
export async function runDecisionAsync<Args, Facts, Result extends RuleResult>(
  decision: Decision<Args, Facts, Result>,
  args: Args,
  lookup: (key: string, input: unknown) => Promise<unknown>
): Promise<
  | (OkBranch<Result> & { facts: Facts })
  | { ok: false; code: FailCode<Result>; facts: Facts }
> {
  const facts: Record<string, unknown> = {}
  for (const entry of decision.plan) {
    const input = entry.input(args, facts as Partial<Facts>)
    if (input === null) continue
    facts[entry.alias] = await lookup(entry.key, input)
  }

  const result = decision.rule(args, facts as Facts)
  if (result.ok)
    return { ...(result as OkBranch<Result>), facts: facts as Facts }
  return {
    ok: false,
    code: result.code as FailCode<Result>,
    facts: facts as Facts
  }
}
