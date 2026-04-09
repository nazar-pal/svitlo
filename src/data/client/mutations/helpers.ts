import { randomUUID } from 'expo-crypto'
import { Alert } from 'react-native'

import {
  getAssignmentForUserAndGenerator,
  getGeneratorOrgId,
  getOrganizationAdminUserId
} from '@/data/client/queries'
import { t } from '@/lib/i18n'

export type MutationResult = { ok: true } | { ok: false; error: string }

export const ok: MutationResult = { ok: true }

export const fail = (error: string): MutationResult => ({ ok: false, error })

export function alertOnError(
  result: MutationResult
): result is { ok: false; error: string } {
  if (!result.ok) Alert.alert(t('common.error'), result.error)
  return !result.ok
}

export const newId = () => randomUUID()

export const nowISO = () => new Date().toISOString()

// ── Shared authorization helpers ─────────────────────────────────────────────

export async function isOrgAdmin(
  userId: string,
  orgId: string
): Promise<boolean> {
  const adminUserId = await getOrganizationAdminUserId(orgId)
  return adminUserId === userId
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
  if (await isOrgAdmin(userId, orgId)) return true
  return (await getAssignmentForUserAndGenerator(userId, generatorId)) !== null
}
