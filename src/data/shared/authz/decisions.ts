import { defineDecision, factPlanFor } from '@/data/shared/facts/decisions'

import * as policy from './policy'

// Decision-style bindings for the three authorization checks. They share the
// single `Rule` shape used across the codebase (`{ ok: true } | { ok: false;
// code }`) so they compose with `runDecisionAsync` / `useDecision` without a
// bespoke adapter. Domain decisions continue to read `authz.generator` /
// `authz.org` facts inline and run the pure predicates from `./policy`; these
// decisions exist for standalone defence-in-depth call sites (e.g. the
// sessions + maintenance-records server handlers, which gate a non-admin
// "only delete your own row" rule on top of the shared policy).

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

export interface IsOrgAdminArgs {
  userId: string
  orgId: string
}

const isOrgAdminPlan = factPlanFor<IsOrgAdminArgs, OrgAuthzFacts>()

export const isOrgAdmin = defineDecision<
  IsOrgAdminArgs,
  OrgAuthzFacts,
  AuthzResult
>({
  id: 'authz.isOrgAdmin',
  plan: [isOrgAdminPlan('org', 'authz.org', a => a.orgId)],
  rule: (args, facts) =>
    policy.isOrgAdmin(args.userId, facts.org?.adminUserId ?? null)
      ? allowed
      : denied
})

interface GeneratorAuthzFacts {
  gen: policy.GeneratorAuthzFact | null
}

export interface IsGeneratorOrgAdminArgs {
  userId: string
  generatorId: string
}

const isGeneratorOrgAdminPlan = factPlanFor<
  IsGeneratorOrgAdminArgs,
  GeneratorAuthzFacts
>()

export const isGeneratorOrgAdmin = defineDecision<
  IsGeneratorOrgAdminArgs,
  GeneratorAuthzFacts,
  AuthzResult
>({
  id: 'authz.isGeneratorOrgAdmin',
  plan: [
    isGeneratorOrgAdminPlan('gen', 'authz.generator', a => ({
      userId: a.userId,
      generatorId: a.generatorId
    }))
  ],
  rule: (args, facts) =>
    policy.isOrgAdmin(args.userId, facts.gen?.orgAdminUserId ?? null)
      ? allowed
      : denied
})

export interface CanAccessGeneratorArgs {
  userId: string
  generatorId: string
}

const canAccessGeneratorPlan = factPlanFor<
  CanAccessGeneratorArgs,
  GeneratorAuthzFacts
>()

export const canAccessGenerator = defineDecision<
  CanAccessGeneratorArgs,
  GeneratorAuthzFacts,
  AuthzResult
>({
  id: 'authz.canAccessGenerator',
  plan: [
    canAccessGeneratorPlan('gen', 'authz.generator', a => ({
      userId: a.userId,
      generatorId: a.generatorId
    }))
  ],
  rule: (args, facts) =>
    policy.canAccessGeneratorFact(args.userId, facts.gen) ? allowed : denied
})
