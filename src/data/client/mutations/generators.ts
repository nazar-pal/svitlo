import { eq } from 'drizzle-orm'

import { generators } from '@/data/client/db-schema'
import {
  insertGeneratorSchema,
  insertMaintenanceTemplateSchema,
  updateGeneratorSchema,
  type InsertGeneratorInput,
  type InsertMaintenanceTemplateInput,
  type UpdateGeneratorInput
} from '@/data/client/validation'
import { db, powersync } from '@/lib/powersync/database'

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

export async function createGeneratorWithMaintenance(
  userId: string,
  input: InsertGeneratorInput,
  maintenanceInputs: Omit<InsertMaintenanceTemplateInput, 'generatorId'>[]
): Promise<MutationResult> {
  const parsed = insertGeneratorSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  if (!(await isOrgAdmin(userId, parsed.data.organizationId)))
    return fail('Only admin can create generators')

  const generatorId = newId()
  const now = nowISO()

  for (const mi of maintenanceInputs) {
    const mParsed = insertMaintenanceTemplateSchema.safeParse({
      ...mi,
      generatorId
    })
    if (!mParsed.success)
      return fail(`${mi.taskName}: ${mParsed.error.issues[0].message}`)
  }

  await powersync.writeTransaction(async tx => {
    await tx.execute(
      'INSERT INTO generators (id, organization_id, title, model, description, max_consecutive_run_hours, required_rest_hours, run_warning_threshold_pct, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        generatorId,
        parsed.data.organizationId,
        parsed.data.title,
        parsed.data.model,
        parsed.data.description ?? null,
        parsed.data.maxConsecutiveRunHours,
        parsed.data.requiredRestHours,
        parsed.data.runWarningThresholdPct,
        now
      ]
    )

    for (const mi of maintenanceInputs) {
      const mParsed = insertMaintenanceTemplateSchema.parse({
        ...mi,
        generatorId
      })
      await tx.execute(
        'INSERT INTO maintenance_templates (id, generator_id, task_name, description, trigger_type, trigger_hours_interval, trigger_calendar_days, is_one_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          newId(),
          generatorId,
          mParsed.taskName,
          mParsed.description ?? null,
          mParsed.triggerType,
          mParsed.triggerHoursInterval ?? null,
          mParsed.triggerCalendarDays ?? null,
          mParsed.isOneTime ? 1 : 0,
          now
        ]
      )
    }
  })

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
