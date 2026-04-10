import { eq } from 'drizzle-orm'

import { canAccessGenerator, isGeneratorOrgAdmin } from '@/data/client/authz'
import {
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/client/db-schema'
import {
  getMaintenanceRecordById,
  getMaintenanceTemplateById
} from '@/data/client/queries'
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

  if (!(await isGeneratorOrgAdmin(userId, parsed.data.generatorId)))
    return fail('ONLY_ADMIN_CAN_CREATE_TEMPLATES')

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

  const existing = await getMaintenanceTemplateById(templateId)
  if (!existing) return fail('TEMPLATE_NOT_FOUND')

  if (!(await isGeneratorOrgAdmin(userId, existing.generatorId)))
    return fail('ONLY_ADMIN_CAN_UPDATE_TEMPLATES')

  // When updating triggerType, validate that the required companion fields
  // will be present after the update. If they're not in the update payload,
  // check the existing template values.
  if (parsed.data.triggerType) {
    const mergedHours =
      parsed.data.triggerHoursInterval ?? existing.triggerHoursInterval
    const mergedDays =
      parsed.data.triggerCalendarDays ?? existing.triggerCalendarDays

    const needsHours =
      parsed.data.triggerType === 'hours' ||
      parsed.data.triggerType === 'whichever_first'
    const needsDays =
      parsed.data.triggerType === 'calendar' ||
      parsed.data.triggerType === 'whichever_first'

    if (needsHours && mergedHours == null)
      return fail('HOURS_INTERVAL_REQUIRED')
    if (needsDays && mergedDays == null) return fail('CALENDAR_DAYS_REQUIRED')
  }

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
  const template = await getMaintenanceTemplateById(templateId)
  if (!template) return fail('TEMPLATE_NOT_FOUND')

  if (!(await isGeneratorOrgAdmin(userId, template.generatorId)))
    return fail('ONLY_ADMIN_CAN_DELETE_TEMPLATES')

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
  const record = await getMaintenanceRecordById(recordId)
  if (!record) return fail('RECORD_NOT_FOUND')

  if (!(await canAccessGenerator(userId, record.generatorId)))
    return fail('NOT_AUTHORIZED_FOR_GENERATOR')

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
  const record = await getMaintenanceRecordById(recordId)
  if (!record) return fail('RECORD_NOT_FOUND')

  if (!(await canAccessGenerator(userId, record.generatorId)))
    return fail('NOT_AUTHORIZED_FOR_GENERATOR')

  if (new Date(input.performedAt) > new Date())
    return fail('PERFORMED_TIME_IN_FUTURE')

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

  if (!(await canAccessGenerator(userId, parsed.data.generatorId)))
    return fail('NOT_AUTHORIZED_FOR_GENERATOR')

  // Verify template exists and belongs to the generator
  const template = await getMaintenanceTemplateById(parsed.data.templateId)
  if (!template) return fail('MAINTENANCE_TEMPLATE_NOT_FOUND')
  if (template.generatorId !== parsed.data.generatorId)
    return fail('TEMPLATE_NOT_FOR_GENERATOR')

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
