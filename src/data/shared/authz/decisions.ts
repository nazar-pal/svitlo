import { defineDecision, factPlanFor } from '@/data/shared/facts/decisions'

import * as policy from './policy'

// Decision-style binding for the org-admin authorization check. It shares the
// single `Rule` shape used across the codebase (`{ ok: true } | { ok: false;
// code }`) so it composes with `runDecisionAsync` / `useDecision` without a
// bespoke adapter. Domain decisions continue to read `authz.generator` /
// `authz.org` facts inline and run the pure predicates from `./policy`; this
// decision exists for the standalone call site in the members server handler,
// which has no domain decision of its own to hang the check on.
//
// Generator-scoped defence-in-depth (the sessions + maintenance-records
// handlers' "only touch your own row" gate) does NOT go through a decision:
// those handlers already hold a resolved `authz.generator` fact from their
// domain decision, so they apply the pure predicate directly via
// `isOwnerOrGeneratorAdmin` rather than paying for a second lookup.

interface AuthzFailure {
  ok: false
  code: 'NOT_AUTHORIZED'
}
export type AuthzResult = { ok: true } | AuthzFailure

const allowed: AuthzResult = { ok: true }
const denied: AuthzFailure = { ok: false, code: 'NOT_AUTHORIZED' }

interface OrgAuthzFacts {
  org: policy.OrgAuthzFact | null
}

interface IsOrgAdminArgs {
  userId: string
  orgId: string
}

const isOrgAdminPlan = factPlanFor<IsOrgAdminArgs, OrgAuthzFacts>()

export const isOrgAdmin = defineDecision<
  IsOrgAdminArgs,
  OrgAuthzFacts,
  AuthzResult
>({
  plan: [isOrgAdminPlan('org', 'authz.org', a => a.orgId)],
  rule: (args, facts) =>
    policy.isOrgAdmin(args.userId, facts.org?.adminUserId ?? null)
      ? allowed
      : denied
})
