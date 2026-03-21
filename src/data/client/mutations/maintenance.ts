import { eq } from 'drizzle-orm'

import {
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/client/db-schema'
import { t } from '@/lib/i18n'
import {
  insertMaintenanceRecordSchema,
  insertMaintenanceTemplateSchema,
  updateMaintenanceTemplateSchema,
  type InsertMaintenanceRecordInput,
  type InsertMaintenanceTemplateInput,
  type UpdateMaintenanceTemplateInput
} from '@/data/client/validation'
import { db, powersync } from '@/lib/powersync/database'

import {
  canAccessGenerator,
  fail,
  isGeneratorOrgAdmin,
  newId,
  nowISO,
  ok,
  type MutationResult
} from './helpers'

export async function createMaintenanceTemplate(
  userId: string,
  input: InsertMaintenanceTemplateInput
): Promise<MutationResult> {
  const parsed = insertMaintenanceTemplateSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  if (!(await isGeneratorOrgAdmin(userId, parsed.data.generatorId)))
    return fail(t('errors.onlyAdminCanCreateTemplates'))

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

export async function createManyMaintenanceTemplates(
  userId: string,
  inputs: InsertMaintenanceTemplateInput[]
): Promise<MutationResult> {
  if (inputs.length === 0) return fail(t('errors.noTemplatesToCreate'))

  const generatorId = inputs[0].generatorId
  if (inputs.some(i => i.generatorId !== generatorId))
    return fail(t('errors.templatesMustBeSameGenerator'))

  for (const input of inputs) {
    const parsed = insertMaintenanceTemplateSchema.safeParse(input)
    if (!parsed.success)
      return fail(`${input.taskName}: ${parsed.error.issues[0].message}`)
  }

  if (!(await isGeneratorOrgAdmin(userId, generatorId)))
    return fail(t('errors.onlyAdminCanCreateTemplates'))

  await powersync.writeTransaction(async tx => {
    for (const input of inputs) {
      const parsed = insertMaintenanceTemplateSchema.parse(input)
      await tx.execute(
        'INSERT INTO maintenance_templates (id, generator_id, task_name, description, trigger_type, trigger_hours_interval, trigger_calendar_days, is_one_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          newId(),
          parsed.generatorId,
          parsed.taskName,
          parsed.description ?? null,
          parsed.triggerType,
          parsed.triggerHoursInterval ?? null,
          parsed.triggerCalendarDays ?? null,
          parsed.isOneTime ? 1 : 0,
          nowISO()
        ]
      )
    }
  })

  return ok
}

export async function updateMaintenanceTemplate(
  userId: string,
  templateId: string,
  input: UpdateMaintenanceTemplateInput
): Promise<MutationResult> {
  const parsed = updateMaintenanceTemplateSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  const [template] = await db
    .select({ generatorId: maintenanceTemplates.generatorId })
    .from(maintenanceTemplates)
    .where(eq(maintenanceTemplates.id, templateId))
    .limit(1)

  if (!template) return fail(t('errors.templateNotFound'))

  if (!(await isGeneratorOrgAdmin(userId, template.generatorId)))
    return fail(t('errors.onlyAdminCanUpdateTemplates'))

  // When updating triggerType, validate that the required companion fields
  // will be present after the update. If they're not in the update payload,
  // check the existing template values.
  if (parsed.data.triggerType) {
    const [existing] = await db
      .select()
      .from(maintenanceTemplates)
      .where(eq(maintenanceTemplates.id, templateId))
      .limit(1)

    if (!existing) return fail(t('errors.templateNotFound'))

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
      return fail(t('errors.hoursIntervalRequired'))
    if (needsDays && mergedDays == null)
      return fail(t('errors.calendarDaysRequired'))
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
  const [template] = await db
    .select({ generatorId: maintenanceTemplates.generatorId })
    .from(maintenanceTemplates)
    .where(eq(maintenanceTemplates.id, templateId))
    .limit(1)

  if (!template) return fail(t('errors.templateNotFound'))

  if (!(await isGeneratorOrgAdmin(userId, template.generatorId)))
    return fail(t('errors.onlyAdminCanDeleteTemplates'))

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
  const [record] = await db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.id, recordId))
    .limit(1)

  if (!record) return fail(t('errors.recordNotFound'))

  if (!(await canAccessGenerator(userId, record.generatorId)))
    return fail(t('errors.notAuthorizedForGenerator'))

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
  const [record] = await db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.id, recordId))
    .limit(1)

  if (!record) return fail(t('errors.recordNotFound'))

  if (!(await canAccessGenerator(userId, record.generatorId)))
    return fail(t('errors.notAuthorizedForGenerator'))

  if (new Date(input.performedAt) > new Date())
    return fail(t('errors.performedTimeInFuture'))

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
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  if (!(await canAccessGenerator(userId, parsed.data.generatorId)))
    return fail(t('errors.notAuthorizedForGenerator'))

  // Verify template exists and belongs to the generator
  const [template] = await db
    .select({ generatorId: maintenanceTemplates.generatorId })
    .from(maintenanceTemplates)
    .where(eq(maintenanceTemplates.id, parsed.data.templateId))
    .limit(1)

  if (!template) return fail(t('errors.maintenanceTemplateNotFound'))
  if (template.generatorId !== parsed.data.generatorId)
    return fail(t('errors.templateNotForGenerator'))

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
