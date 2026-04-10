import * as policy from '@/data/shared/authz/policy'

import { getGeneratorAuthzFacts, getOrgAuthzFacts } from './queries'

export async function isOrgAdmin(
  userId: string,
  orgId: string
): Promise<boolean> {
  const facts = await getOrgAuthzFacts(orgId)
  return policy.isOrgAdmin(userId, facts?.adminUserId ?? null)
}

export async function isGeneratorOrgAdmin(
  userId: string,
  generatorId: string
): Promise<boolean> {
  const facts = await getGeneratorAuthzFacts(userId, generatorId)
  return facts ? policy.isOrgAdmin(userId, facts.orgAdminUserId) : false
}

export async function canAccessGenerator(
  userId: string,
  generatorId: string
): Promise<boolean> {
  const facts = await getGeneratorAuthzFacts(userId, generatorId)
  if (!facts) return false
  return policy.canAccessGenerator(
    userId,
    facts.orgAdminUserId,
    facts.hasAssignment
  )
}
