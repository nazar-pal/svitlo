import { eq } from 'drizzle-orm'

import {
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/client/db-schema'
import { maintenanceLifecycleChecks } from '@/data/client/maintenance'
import {
  insertMaintenanceRecordSchema,
  insertMaintenanceTemplateSchema,
  updateMaintenanceTemplateSchema,
  type InsertMaintenanceRecordInput,
  type InsertMaintenanceTemplateInput,
  type UpdateMaintenanceTemplateInput
} from '@/data/client/validation'
import { failFromZod } from '@/data/shared/errors-from-zod'
import { db } from '@/lib/powersync/database'

import { fail, newId, nowISO, ok, type MutationResult } from './helpers'

export async function createMaintenanceTemplate(
  userId: string,
  input: InsertMaintenanceTemplateInput
): Promise<MutationResult> {
  const parsed = insertMaintenanceTemplateSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)

  const result = await maintenanceLifecycleChecks.createTemplate(userId, {
    generatorId: parsed.data.generatorId
  })
  if (!result.ok) return fail(result.code)

  await db.insert(maintenanceTemplates).values({
    id: newId(),
    generatorId: parsed.data.generatorId,
    taskName: parsed.data.taskName,
    description: parsed.data.description ?? null,
    triggerType: parsed.data.triggerType,
    triggerHoursInterval: parsed.data.triggerHoursInterval ?? null,
    triggerCalendarDays: parsed.data.triggerCalendarDays ?? null,
    isOneTime: parsed.data.isOneTime ? 1 : 0,
    createdAt: nowISO()
  })

  return ok
}

export async function updateMaintenanceTemplate(
  userId: string,
  templateId: string,
  input: UpdateMaintenanceTemplateInput
): Promise<MutationResult> {
  const parsed = updateMaintenanceTemplateSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)

  const result = await maintenanceLifecycleChecks.updateTemplate(
    userId,
    templateId,
    {
      triggerType: parsed.data.triggerType,
      triggerHoursInterval: parsed.data.triggerHoursInterval,
      triggerCalendarDays: parsed.data.triggerCalendarDays
    }
  )
  if (!result.ok) return fail(result.code)

  const { isOneTime, ...rest } = parsed.data
  await db
    .update(maintenanceTemplates)
    .set({
      ...rest,
      ...(isOneTime != null && { isOneTime: isOneTime ? 1 : 0 })
    })
    .where(eq(maintenanceTemplates.id, templateId))

  return ok
}

export async function deleteMaintenanceTemplate(
  userId: string,
  templateId: string
): Promise<MutationResult> {
  const result = await maintenanceLifecycleChecks.deleteTemplate(
    userId,
    templateId
  )
  if (!result.ok) return fail(result.code)

  await db
    .delete(maintenanceTemplates)
    .where(eq(maintenanceTemplates.id, templateId))

  return ok
}

// No ownership check needed: PowerSync sync rules + client-side filtering ensure
// users only see activity for generators they can access (admin or assigned).
export async function deleteMaintenanceRecord(
  userId: string,
  recordId: string
): Promise<MutationResult> {
  const result = await maintenanceLifecycleChecks.deleteRecord(userId, recordId)
  if (!result.ok) return fail(result.code)

  await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, recordId))

  return ok
}

// No ownership check needed: PowerSync sync rules + client-side filtering ensure
// users only see activity for generators they can access (admin or assigned).
export async function updateMaintenanceRecord(
  userId: string,
  recordId: string,
  input: { performedAt: string; notes: string | null }
): Promise<MutationResult> {
  const result = await maintenanceLifecycleChecks.updateRecord(
    userId,
    recordId,
    { performedAt: input.performedAt },
    new Date()
  )
  if (!result.ok) return fail(result.code)

  await db
    .update(maintenanceRecords)
    .set({
      performedAt: input.performedAt,
      notes: input.notes
    })
    .where(eq(maintenanceRecords.id, recordId))

  return ok
}

export async function recordMaintenance(
  userId: string,
  input: InsertMaintenanceRecordInput
): Promise<MutationResult> {
  const parsed = insertMaintenanceRecordSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)

  const result = await maintenanceLifecycleChecks.recordMaintenance(userId, {
    generatorId: parsed.data.generatorId,
    templateId: parsed.data.templateId
  })
  if (!result.ok) return fail(result.code)

  await db.insert(maintenanceRecords).values({
    id: newId(),
    templateId: parsed.data.templateId,
    generatorId: parsed.data.generatorId,
    performedByUserId: userId,
    performedAt: parsed.data.performedAt ?? nowISO(),
    notes: parsed.data.notes ?? null
  })

  return ok
}
