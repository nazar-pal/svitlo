import { z } from 'zod'

import {
  TRIGGER_TYPES,
  type TriggerType,
  usesCalendar,
  usesHours
} from '@/lib/maintenance/trigger-type'
import { zNonEmptyString, zPositiveInt, zPositiveReal } from './helpers'

const triggerTypeEnum = z.enum(TRIGGER_TYPES)

function refineTriggerFields(
  data: {
    triggerType?: TriggerType | null
    triggerHoursInterval?: number | null
    triggerCalendarDays?: number | null
  },
  ctx: z.RefinementCtx
) {
  if (data.triggerType == null) return

  if (usesHours(data.triggerType) && data.triggerHoursInterval == null)
    ctx.addIssue({
      code: 'custom',
      path: ['triggerHoursInterval'],
      message: 'REQUIRED_FOR_TRIGGER_TYPE'
    })

  if (usesCalendar(data.triggerType) && data.triggerCalendarDays == null)
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
