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

// ── createGenerator ─────────────────────────────────────────────────────────

interface CreateGeneratorArgs {
  userId: string
  organizationId: string
}

interface CreateGeneratorFacts {
  authzOrg: authzPolicy.OrgAuthzFact | null
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
  plan: [createGeneratorPlan('authzOrg', 'authz.org', a => a.organizationId)],
  rule: (args, facts) =>
    authzPolicy.isOrgAdmin(args.userId, facts.authzOrg?.adminUserId ?? null)
      ? ok
      : fail('ONLY_ADMIN_CAN_CREATE_GENERATORS')
})

// ── updateGenerator ─────────────────────────────────────────────────────────

interface UpdateGeneratorArgs {
  userId: string
  generatorId: string
}

interface UpdateGeneratorFacts {
  authzGenerator: authzPolicy.GeneratorAuthzFact | null
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
  plan: [
    updateGeneratorPlan('authzGenerator', 'authz.generator', a => ({
      userId: a.userId,
      generatorId: a.generatorId
    }))
  ],
  rule: (args, facts) => {
    if (!facts.authzGenerator) return fail('GENERATOR_NOT_FOUND')
    if (
      !authzPolicy.isOrgAdmin(args.userId, facts.authzGenerator.orgAdminUserId)
    )
      return fail('ONLY_ADMIN_CAN_UPDATE_GENERATORS')
    return ok
  }
})

// ── deleteGenerator ─────────────────────────────────────────────────────────

interface DeleteGeneratorArgs {
  userId: string
  generatorId: string
}

interface DeleteGeneratorFacts {
  authzGenerator: authzPolicy.GeneratorAuthzFact | null
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
  plan: [
    deleteGeneratorPlan('authzGenerator', 'authz.generator', a => ({
      userId: a.userId,
      generatorId: a.generatorId
    }))
  ],
  rule: (args, facts) => {
    if (!facts.authzGenerator) return fail('GENERATOR_NOT_FOUND')
    if (
      !authzPolicy.isOrgAdmin(args.userId, facts.authzGenerator.orgAdminUserId)
    )
      return fail('ONLY_ADMIN_CAN_DELETE_GENERATORS')
    return ok
  }
})
