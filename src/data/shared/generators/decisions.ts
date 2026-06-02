import * as authzPolicy from '@/data/shared/authz/policy'
import { defineDecision, factPlanFor } from '@/data/shared/facts/decisions'
import {
  policyFail as fail,
  policyOk as ok,
  type PolicyResult
} from '@/data/shared/policy-result'

// Decision-style bindings for the generator lifecycle. Rules stay inline
// because they're trivial ("row exists? caller is admin?") — the shape that
// makes the sessions decisions worth the split (temporal + state-machine
// branches) doesn't apply here.

type OrgAuthzFact = { adminUserId: string | null } | null
type GeneratorAuthzFact = authzPolicy.GeneratorAuthzFact | null

// ── createGenerator ─────────────────────────────────────────────────────────

export interface CreateGeneratorArgs {
  userId: string
  organizationId: string
}

interface CreateGeneratorFacts {
  authzOrg: OrgAuthzFact
}

const createGeneratorPlan = factPlanFor<
  CreateGeneratorArgs,
  CreateGeneratorFacts
>()

export const createGenerator = defineDecision<
  CreateGeneratorArgs,
  CreateGeneratorFacts,
  PolicyResult
>({
  id: 'generators.createGenerator',
  plan: [createGeneratorPlan('authzOrg', 'authz.org', a => a.organizationId)],
  rule: (args, facts) =>
    authzPolicy.isOrgAdmin(args.userId, facts.authzOrg?.adminUserId ?? null)
      ? ok
      : fail('ONLY_ADMIN_CAN_CREATE_GENERATORS')
})

// ── updateGenerator ─────────────────────────────────────────────────────────

export interface UpdateGeneratorArgs {
  userId: string
  generatorId: string
}

interface UpdateGeneratorFacts {
  generator: { id: string } | null
  authzGenerator: GeneratorAuthzFact
}

const updateGeneratorPlan = factPlanFor<
  UpdateGeneratorArgs,
  UpdateGeneratorFacts
>()

export const updateGenerator = defineDecision<
  UpdateGeneratorArgs,
  UpdateGeneratorFacts,
  PolicyResult
>({
  id: 'generators.updateGenerator',
  plan: [
    updateGeneratorPlan('generator', 'generator.byId', a => a.generatorId),
    updateGeneratorPlan('authzGenerator', 'authz.generator', a => ({
      userId: a.userId,
      generatorId: a.generatorId
    }))
  ],
  rule: (args, facts) => {
    if (!facts.generator) return fail('GENERATOR_NOT_FOUND')
    if (
      !authzPolicy.isOrgAdmin(
        args.userId,
        facts.authzGenerator?.orgAdminUserId ?? null
      )
    )
      return fail('ONLY_ADMIN_CAN_UPDATE_GENERATORS')
    return ok
  }
})

// ── deleteGenerator ─────────────────────────────────────────────────────────

export interface DeleteGeneratorArgs {
  userId: string
  generatorId: string
}

interface DeleteGeneratorFacts {
  generator: { id: string } | null
  authzGenerator: GeneratorAuthzFact
}

const deleteGeneratorPlan = factPlanFor<
  DeleteGeneratorArgs,
  DeleteGeneratorFacts
>()

export const deleteGenerator = defineDecision<
  DeleteGeneratorArgs,
  DeleteGeneratorFacts,
  PolicyResult
>({
  id: 'generators.deleteGenerator',
  plan: [
    deleteGeneratorPlan('generator', 'generator.byId', a => a.generatorId),
    deleteGeneratorPlan('authzGenerator', 'authz.generator', a => ({
      userId: a.userId,
      generatorId: a.generatorId
    }))
  ],
  rule: (args, facts) => {
    if (!facts.generator) return fail('GENERATOR_NOT_FOUND')
    if (
      !authzPolicy.isOrgAdmin(
        args.userId,
        facts.authzGenerator?.orgAdminUserId ?? null
      )
    )
      return fail('ONLY_ADMIN_CAN_DELETE_GENERATORS')
    return ok
  }
})
