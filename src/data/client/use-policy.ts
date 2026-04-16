import * as invitationsP from '@/data/shared/invitations/decisions'
import * as membersP from '@/data/shared/members/decisions'
import * as organizationsP from '@/data/shared/organizations/decisions'
import * as sessionsP from '@/data/shared/sessions/decisions'
import type { Decision, PolicyView } from '@/data/shared/facts/port'
import {
  useDecision,
  type ReactiveRegistry
} from '@/data/shared/facts/reactive-adapter'
import * as powerSyncDb from '@/lib/powersync/database'

import { buildReactiveRegistry } from './registry'

const reactiveRegistry: ReactiveRegistry = buildReactiveRegistry(
  () => powerSyncDb.db
)

type Rule = { ok: true } | { ok: false; code: string }

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
export function usePolicy<Args, Facts, R extends Rule>(
  decision: Decision<Args, Facts, R>,
  args: Args | null
): PolicyView {
  return useDecision(decision, args, reactiveRegistry)
}

// Only domains with reactive UI gates are exposed here. Generators,
// assignments, and maintenance are mutation-only today — they have no
// affordance/disable state in the screens, so adding them would be dead
// code. Mutation paths consume those checks via `MutationContext.checks`
// (see `mutations/context.ts`) instead.
export const policies = {
  sessions: sessionsP,
  members: membersP,
  invitations: invitationsP,
  organizations: organizationsP
}

// Re-export so screens can narrow `PolicyView` without reaching into the
// facts port directly.
export { isPolicyAllowed } from '@/data/shared/facts/port'
export type { PolicyView }
