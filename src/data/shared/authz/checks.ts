import * as policy from './policy'
import type { AuthzFactsProvider } from './provider'

export interface AuthzChecks {
  isOrgAdmin(userId: string, orgId: string): Promise<boolean>
  isGeneratorOrgAdmin(userId: string, generatorId: string): Promise<boolean>
  canAccessGenerator(userId: string, generatorId: string): Promise<boolean>
}

// Single source of truth for check logic. Both client (PowerSync SQLite) and
// server (Postgres) adapters funnel through here — the only thing each side
// customises is how facts get fetched.
export function createAuthzChecks(provider: AuthzFactsProvider): AuthzChecks {
  return {
    async isOrgAdmin(userId, orgId) {
      const facts = await provider.getOrgFacts(orgId)
      return policy.isOrgAdmin(userId, facts?.adminUserId ?? null)
    },
    async isGeneratorOrgAdmin(userId, generatorId) {
      const facts = await provider.getGeneratorFacts(userId, generatorId)
      return facts ? policy.isOrgAdmin(userId, facts.orgAdminUserId) : false
    },
    async canAccessGenerator(userId, generatorId) {
      const facts = await provider.getGeneratorFacts(userId, generatorId)
      if (!facts) return false
      return policy.canAccessGenerator(
        userId,
        facts.orgAdminUserId,
        facts.hasAssignment
      )
    }
  }
}
