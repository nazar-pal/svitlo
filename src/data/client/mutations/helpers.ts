import { and, eq } from 'drizzle-orm'

import {
  generators,
  generatorUserAssignments,
  organizations
} from '@/data/client/db-schema'
import { db } from '@/lib/powersync/database'

export type MutationResult = { ok: true } | { ok: false; error: string }

export const ok: MutationResult = { ok: true }

export const fail = (error: string): MutationResult => ({ ok: false, error })

export const newId = () => crypto.randomUUID()

export const nowISO = () => new Date().toISOString()

// ── Shared authorization helpers ─────────────────────────────────────────────

export async function isOrgAdmin(
  userId: string,
  orgId: string
): Promise<boolean> {
  const [org] = await db
    .select({ adminUserId: organizations.adminUserId })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1)
  return org?.adminUserId === userId
}

export async function getGeneratorOrg(generatorId: string) {
  const [gen] = await db
    .select({ organizationId: generators.organizationId })
    .from(generators)
    .where(eq(generators.id, generatorId))
    .limit(1)
  return gen ?? null
}

export async function isGeneratorOrgAdmin(
  userId: string,
  generatorId: string
): Promise<boolean> {
  const gen = await getGeneratorOrg(generatorId)
  if (!gen) return false
  return isOrgAdmin(userId, gen.organizationId)
}

export async function canAccessGenerator(
  userId: string,
  generatorId: string
): Promise<boolean> {
  const gen = await getGeneratorOrg(generatorId)
  if (!gen) return false
  if (await isOrgAdmin(userId, gen.organizationId)) return true

  const [assignment] = await db
    .select({ id: generatorUserAssignments.id })
    .from(generatorUserAssignments)
    .where(
      and(
        eq(generatorUserAssignments.generatorId, generatorId),
        eq(generatorUserAssignments.userId, userId)
      )
    )
    .limit(1)
  return !!assignment
}
