import { z } from 'zod'

import { zNonEmptyString, zPositiveInt, zPositiveReal } from './helpers'

const triggerTypeEnum = z.enum(['hours', 'calendar', 'whichever_first'])

export const insertMaintenanceTemplateSchema = z
  .object({
    generatorId: z.string(),
    taskName: zNonEmptyString,
    description: z.string().optional(),
    triggerType: triggerTypeEnum,
    triggerHoursInterval: zPositiveReal.optional(),
    triggerCalendarDays: zPositiveInt.optional()
  })
  .superRefine((data, ctx) => {
    const needsHours =
      data.triggerType === 'hours' || data.triggerType === 'whichever_first'
    const needsDays =
      data.triggerType === 'calendar' || data.triggerType === 'whichever_first'

    if (needsHours && data.triggerHoursInterval == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['triggerHoursInterval'],
        message: `Required when trigger type is "${data.triggerType}"`
      })
    }

    if (needsDays && data.triggerCalendarDays == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['triggerCalendarDays'],
        message: `Required when trigger type is "${data.triggerType}"`
      })
    }
  })

export type InsertMaintenanceTemplateInput = z.input<
  typeof insertMaintenanceTemplateSchema
>

export const updateMaintenanceTemplateSchema = z
  .object({
    taskName: zNonEmptyString,
    description: z.string().nullable(),
    triggerType: triggerTypeEnum,
    triggerHoursInterval: zPositiveReal.nullable(),
    triggerCalendarDays: zPositiveInt.nullable()
  })
  .partial()
  .superRefine((data, ctx) => {
    // Only validate cross-field when triggerType is explicitly provided
    if (data.triggerType == null) return

    const needsHours =
      data.triggerType === 'hours' || data.triggerType === 'whichever_first'
    const needsDays =
      data.triggerType === 'calendar' || data.triggerType === 'whichever_first'

    if (needsHours && data.triggerHoursInterval == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['triggerHoursInterval'],
        message: `Required when trigger type is "${data.triggerType}"`
      })
    }

    if (needsDays && data.triggerCalendarDays == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['triggerCalendarDays'],
        message: `Required when trigger type is "${data.triggerType}"`
      })
    }
  })

export type UpdateMaintenanceTemplateInput = z.input<
  typeof updateMaintenanceTemplateSchema
>

export const insertMaintenanceRecordSchema = z.object({
  templateId: z.string(),
  generatorId: z.string(),
  performedAt: z.string().datetime().optional(),
  notes: z.string().optional()
})

export type InsertMaintenanceRecordInput = z.input<
  typeof insertMaintenanceRecordSchema
>
