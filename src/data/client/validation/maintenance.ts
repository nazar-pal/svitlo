import { z } from 'zod'

import { TRIGGER_TYPES } from '@/lib/maintenance/trigger-type'
import { zNonEmptyString, zPositiveInt, zPositiveReal } from './helpers'

const triggerTypeEnum = z.enum(TRIGGER_TYPES)

function refineTriggerFields(
  data: {
    triggerType?: string | null
    triggerHoursInterval?: number | null
    triggerCalendarDays?: number | null
  },
  ctx: z.RefinementCtx
) {
  if (data.triggerType == null) return

  const needsHours =
    data.triggerType === 'hours' || data.triggerType === 'whichever_first'
  const needsDays =
    data.triggerType === 'calendar' || data.triggerType === 'whichever_first'

  if (needsHours && data.triggerHoursInterval == null)
    ctx.addIssue({
      code: 'custom',
      path: ['triggerHoursInterval'],
      message: 'REQUIRED_FOR_TRIGGER_TYPE'
    })

  if (needsDays && data.triggerCalendarDays == null)
    ctx.addIssue({
      code: 'custom',
      path: ['triggerCalendarDays'],
      message: 'REQUIRED_FOR_TRIGGER_TYPE'
    })
}

export const insertMaintenanceTemplateSchema = z
  .object({
    generatorId: z.string(),
    taskName: zNonEmptyString,
    description: z.string().optional(),
    triggerType: triggerTypeEnum,
    triggerHoursInterval: zPositiveReal.optional(),
    triggerCalendarDays: zPositiveInt.optional(),
    isOneTime: z.boolean().default(false)
  })
  .superRefine(refineTriggerFields)

export type InsertMaintenanceTemplateInput = z.input<
  typeof insertMaintenanceTemplateSchema
>

export const updateMaintenanceTemplateSchema = z
  .object({
    taskName: zNonEmptyString,
    description: z.string().nullable(),
    triggerType: triggerTypeEnum,
    triggerHoursInterval: zPositiveReal.nullable(),
    triggerCalendarDays: zPositiveInt.nullable(),
    isOneTime: z.boolean()
  })
  .partial()
  .refine(data => Object.keys(data).length > 0, {
    error: 'AT_LEAST_ONE_FIELD'
  })

export type UpdateMaintenanceTemplateInput = z.input<
  typeof updateMaintenanceTemplateSchema
>

export const insertMaintenanceRecordSchema = z.object({
  templateId: z.string(),
  generatorId: z.string(),
  performedAt: z.iso.datetime().optional(),
  notes: z.string().optional()
})

export type InsertMaintenanceRecordInput = z.input<
  typeof insertMaintenanceRecordSchema
>
