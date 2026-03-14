import { eq } from 'drizzle-orm'

import { generators } from '@/data/client/db-schema'
import {
  insertGeneratorSchema,
  updateGeneratorSchema,
  type InsertGeneratorInput,
  type UpdateGeneratorInput
} from '@/data/client/validation'
import { db } from '@/lib/powersync/database'

import {
  fail,
  isGeneratorOrgAdmin,
  isOrgAdmin,
  newId,
  nowISO,
  ok,
  type MutationResult
} from './helpers'

export async function createGenerator(
  userId: string,
  input: InsertGeneratorInput
): Promise<MutationResult> {
  const parsed = insertGeneratorSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  if (!(await isOrgAdmin(userId, parsed.data.organizationId)))
    return fail('Only admin can create generators')

  await db.insert(generators).values({
    id: newId(),
    organizationId: parsed.data.organizationId,
    title: parsed.data.title,
    model: parsed.data.model,
    generatorType: parsed.data.generatorType,
    description: parsed.data.description ?? null,
    maxConsecutiveRunHours: parsed.data.maxConsecutiveRunHours,
    requiredRestHours: parsed.data.requiredRestHours,
    runWarningThresholdPct: parsed.data.runWarningThresholdPct,
    createdAt: nowISO()
  })

  return ok
}

export async function updateGenerator(
  userId: string,
  generatorId: string,
  input: UpdateGeneratorInput
): Promise<MutationResult> {
  const parsed = updateGeneratorSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  if (!(await isGeneratorOrgAdmin(userId, generatorId)))
    return fail('Only admin can update generators')

  await db
    .update(generators)
    .set(parsed.data)
    .where(eq(generators.id, generatorId))

  return ok
}

export async function deleteGenerator(
  userId: string,
  generatorId: string
): Promise<MutationResult> {
  if (!(await isGeneratorOrgAdmin(userId, generatorId)))
    return fail('Only admin can delete generators')

  await db.delete(generators).where(eq(generators.id, generatorId))

  return ok
}
