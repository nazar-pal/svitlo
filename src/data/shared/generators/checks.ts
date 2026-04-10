import type { AuthzChecks } from '@/data/shared/authz'
import {
  policyFail as fail,
  policyOk as ok,
  type PolicyResult
} from '@/data/shared/policy-result'

import type { GeneratorFactsProvider } from './facts'

export interface GeneratorLifecycleChecks {
  createGenerator(userId: string, organizationId: string): Promise<PolicyResult>
  updateGenerator(userId: string, generatorId: string): Promise<PolicyResult>
  deleteGenerator(userId: string, generatorId: string): Promise<PolicyResult>
}

// Single source of truth for generator-lifecycle decisions. Both client
// (PowerSync SQLite) and server (Postgres) adapters funnel through here —
// each side only customises how facts get fetched and how authz is built.
//
// The rules themselves are trivial ("is the row there? is the caller an
// admin?") so they live inline rather than in a separate `policy.ts` the way
// sessions does — sessions earns the split with temporal/state-machine logic
// that generators simply does not have.
export function createGeneratorLifecycleChecks(
  facts: GeneratorFactsProvider,
  authz: AuthzChecks
): GeneratorLifecycleChecks {
  return {
    async createGenerator(userId, organizationId) {
      const isOrgAdmin = await authz.isOrgAdmin(userId, organizationId)
      if (!isOrgAdmin) return fail('ONLY_ADMIN_CAN_CREATE_GENERATORS')
      return ok
    },

    async updateGenerator(userId, generatorId) {
      const [generator, isGeneratorOrgAdmin] = await Promise.all([
        facts.findGenerator(generatorId),
        authz.isGeneratorOrgAdmin(userId, generatorId)
      ])
      if (!generator) return fail('GENERATOR_NOT_FOUND')
      if (!isGeneratorOrgAdmin) return fail('ONLY_ADMIN_CAN_UPDATE_GENERATORS')
      return ok
    },

    async deleteGenerator(userId, generatorId) {
      const [generator, isGeneratorOrgAdmin] = await Promise.all([
        facts.findGenerator(generatorId),
        authz.isGeneratorOrgAdmin(userId, generatorId)
      ])
      if (!generator) return fail('GENERATOR_NOT_FOUND')
      if (!isGeneratorOrgAdmin) return fail('ONLY_ADMIN_CAN_DELETE_GENERATORS')
      return ok
    }
  }
}
