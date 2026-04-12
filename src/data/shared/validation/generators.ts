import { z } from 'zod'

import { zNonEmptyString, zPositiveReal } from './helpers'

export const insertGeneratorSchema = z.object({
  organizationId: z.string(),
  title: zNonEmptyString,
  model: zNonEmptyString,
  description: z.string().optional(),
  maxConsecutiveRunHours: zPositiveReal,
  requiredRestHours: zPositiveReal,
  runWarningThresholdPct: z
    .number()
    .int()
    .min(1, { error: 'MIN_PERCENT' })
    .max(100, { error: 'MAX_PERCENT' })
    .default(80)
})

export type InsertGeneratorInput = z.input<typeof insertGeneratorSchema>

export const updateGeneratorSchema = z
  .object({
    title: zNonEmptyString,
    model: zNonEmptyString,
    description: z.string().nullable(),
    maxConsecutiveRunHours: zPositiveReal,
    requiredRestHours: zPositiveReal,
    runWarningThresholdPct: z
      .number()
      .int()
      .min(1, { error: 'MIN_PERCENT' })
      .max(100, { error: 'MAX_PERCENT' })
  })
  .partial()
  .refine(data => Object.keys(data).length > 0, {
    error: 'AT_LEAST_ONE_FIELD'
  })

export type UpdateGeneratorInput = z.input<typeof updateGeneratorSchema>
