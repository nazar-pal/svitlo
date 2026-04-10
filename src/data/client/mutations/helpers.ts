import { randomUUID } from 'expo-crypto'

import {
  getAssignmentForUserAndGenerator,
  getGeneratorOrgId,
  getOrganizationAdminUserId
} from '@/data/client/queries'
import * as policy from '@/data/shared/authz/policy'

export { fail, ok, type MutationResult } from '@/data/shared/result'

export const newId = () => randomUUID()

export const nowISO = () => new Date().toISOString()

// ── Authorization ────────────────────────────────────────────────────────────
// Thin wrappers that fetch from the local PowerSync DB and apply the shared
// pure policy. Each call site stays target-appropriate (no `db` arg) while
// the rule itself lives in src/data/shared/authz/policy.ts.

export async function isOrgAdmin(
  userId: string,
  orgId: string
): Promise<boolean> {
  return policy.isOrgAdmin(userId, await getOrganizationAdminUserId(orgId))
}

export async function isGeneratorOrgAdmin(
  userId: string,
  generatorId: string
): Promise<boolean> {
  const orgId = await getGeneratorOrgId(generatorId)
  return orgId ? isOrgAdmin(userId, orgId) : false
}

export async function canAccessGenerator(
  userId: string,
  generatorId: string
): Promise<boolean> {
  const orgId = await getGeneratorOrgId(generatorId)
  if (!orgId) return false
  const adminUserId = await getOrganizationAdminUserId(orgId)
  if (policy.isOrgAdmin(userId, adminUserId)) return true
  const assignment = await getAssignmentForUserAndGenerator(userId, generatorId)
  return policy.canAccessGenerator(userId, adminUserId, assignment !== null)
}
