import { eq } from 'drizzle-orm'

import {
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/client/db-schema'
import {
  insertMaintenanceRecordSchema,
  insertMaintenanceTemplateSchema,
  updateMaintenanceTemplateSchema,
  type InsertMaintenanceRecordInput,
  type InsertMaintenanceTemplateInput,
  type UpdateMaintenanceTemplateInput
} from '@/data/client/validation'
import { db } from '@/lib/powersync/database'

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
    return fail('Only admin can create maintenance templates')

  await db.insert(maintenanceTemplates).values({
    id: newId(),
    generatorId: parsed.data.generatorId,
    taskName: parsed.data.taskName,
    description: parsed.data.description ?? null,
    triggerType: parsed.data.triggerType,
    triggerHoursInterval: parsed.data.triggerHoursInterval ?? null,
    triggerCalendarDays: parsed.data.triggerCalendarDays ?? null,
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
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  const [template] = await db
    .select({ generatorId: maintenanceTemplates.generatorId })
    .from(maintenanceTemplates)
    .where(eq(maintenanceTemplates.id, templateId))
    .limit(1)

  if (!template) return fail('Template not found')

  if (!(await isGeneratorOrgAdmin(userId, template.generatorId)))
    return fail('Only admin can update maintenance templates')

  // When updating triggerType, validate that the required companion fields
  // will be present after the update. If they're not in the update payload,
  // check the existing template values.
  if (parsed.data.triggerType) {
    const [existing] = await db
      .select()
      .from(maintenanceTemplates)
      .where(eq(maintenanceTemplates.id, templateId))
      .limit(1)

    if (!existing) return fail('Template not found')

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
      return fail('Hours interval required for this trigger type')
    if (needsDays && mergedDays == null)
      return fail('Calendar days required for this trigger type')
  }

  await db
    .update(maintenanceTemplates)
    .set(parsed.data)
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

  if (!template) return fail('Template not found')

  if (!(await isGeneratorOrgAdmin(userId, template.generatorId)))
    return fail('Only admin can delete maintenance templates')

  await db
    .delete(maintenanceTemplates)
    .where(eq(maintenanceTemplates.id, templateId))

  return ok
}

export async function deleteMaintenanceRecord(
  userId: string,
  recordId: string
): Promise<MutationResult> {
  const [record] = await db
    .select()
    .from(maintenanceRecords)
    .where(eq(maintenanceRecords.id, recordId))
    .limit(1)

  if (!record) return fail('Record not found')

  const isAdmin = await isGeneratorOrgAdmin(userId, record.generatorId)
  if (!isAdmin) {
    if (!(await canAccessGenerator(userId, record.generatorId)))
      return fail('Not authorized for this generator')
    if (record.performedByUserId !== userId)
      return fail('You can only delete your own records')
  }

  await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, recordId))

  return ok
}

export async function recordMaintenance(
  userId: string,
  input: InsertMaintenanceRecordInput
): Promise<MutationResult> {
  const parsed = insertMaintenanceRecordSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  if (!(await canAccessGenerator(userId, parsed.data.generatorId)))
    return fail('Not authorized for this generator')

  // Verify template exists and belongs to the generator
  const [template] = await db
    .select({ generatorId: maintenanceTemplates.generatorId })
    .from(maintenanceTemplates)
    .where(eq(maintenanceTemplates.id, parsed.data.templateId))
    .limit(1)

  if (!template) return fail('Maintenance template not found')
  if (template.generatorId !== parsed.data.generatorId)
    return fail('Template does not belong to this generator')

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
