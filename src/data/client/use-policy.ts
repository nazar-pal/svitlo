import * as invitationsD from '@/data/shared/invitations/decisions'
import * as membersD from '@/data/shared/members/decisions'
import * as sessionsD from '@/data/shared/sessions/decisions'
import type { Decision, PolicyView } from '@/data/shared/facts/port'
import {
  useDecision,
  type ReactiveRegistry
} from '@/data/shared/facts/reactive-adapter'
import type { PolicyResult } from '@/data/shared/policy-result'
import * as powerSyncDb from '@/lib/powersync/database'

import { buildReactiveRegistry } from './registry'

const reactiveRegistry: ReactiveRegistry = buildReactiveRegistry(
  () => powerSyncDb.db
)

// Single reactive policy hook. Replaces the previous per-rule hand-written
// hooks (`useCanStartSession`, `useCanRemoveMember`, …) with one entry point
// that walks any decision's plan via `useDecision`.
//
// A namespaced shape (`usePolicy.<domain>.<rule>(args)`) was tried first but
// rejected: the leaf identifier wouldn't start with `use`, so React
// Compiler's hook-name heuristic would treat calls as ordinary functions
// and could skip the inner `useDrizzleQuery` calls across renders.
// Flattening to a single `usePolicy(decision, args)` keeps detection
// correct; decisions are passed via the re-exported `policies` namespace so
// call sites read naturally:
//
//   const view = usePolicy(policies.invitations.createInvitation, args)
//
// `args: Args | null` preserves the "gate this hook" ergonomic of the old
// `useCanX(userId | null, entityId | null)` form — null forces LOADING via
// `useDecision` without breaking hook order.
export function usePolicy<Args, Facts, R extends PolicyResult>(
  decision: Decision<Args, Facts, R>,
  args: Args | null
): PolicyView {
  return useDecision(decision, args, reactiveRegistry)
}

// Only domains with reactive UI gates are exposed here. Generators,
// assignments, maintenance, and organizations are mutation-only today —
// no screen gates on them reactively, so exposing them would be dead code.
// (Domains are exposed whole, so some decisions inside these namespaces
// also ride along async-only until a screen adopts them reactively.)
// Mutation paths consume those checks via `MutationContext.checks` (see
// `mutations/context.ts`) instead.
export const policies = {
  sessions: sessionsD,
  members: membersD,
  invitations: invitationsD
}

// Re-export so screens can narrow `PolicyView` without reaching into the
// facts port directly.
export { isPolicyAllowed } from '@/data/shared/facts/port'
export type { PolicyView }
