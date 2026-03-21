import { z } from 'zod'

import { t } from '@/lib/i18n'
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
    .min(1, { error: () => t('validation.minPercent') })
    .max(100, { error: () => t('validation.maxPercent') })
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
      .min(1, { error: () => t('validation.minPercent') })
      .max(100, { error: () => t('validation.maxPercent') })
  })
  .partial()
  .refine(data => Object.keys(data).length > 0, {
    error: () => t('validation.atLeastOneField')
  })

export type UpdateGeneratorInput = z.input<typeof updateGeneratorSchema>
