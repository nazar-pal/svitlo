import { z } from 'zod'

import { zNonEmptyString, zPositiveReal } from './helpers'

export const GENERATOR_TYPES = [
  'diesel',
  'gasoline',
  'natural_gas',
  'propane',
  'dual_fuel',
  'solar',
  'inverter'
] as const

export const insertGeneratorSchema = z.object({
  organizationId: z.string(),
  title: zNonEmptyString,
  model: zNonEmptyString,
  generatorType: z.enum(GENERATOR_TYPES),
  description: z.string().optional(),
  maxConsecutiveRunHours: zPositiveReal,
  requiredRestHours: zPositiveReal,
  runWarningThresholdPct: z
    .number()
    .int()
    .min(1, { error: 'Must be at least 1%' })
    .max(100, { error: 'Must be at most 100%' })
    .default(80)
})

export type InsertGeneratorInput = z.input<typeof insertGeneratorSchema>

export const updateGeneratorSchema = z
  .object({
    title: zNonEmptyString,
    model: zNonEmptyString,
    generatorType: z.enum(GENERATOR_TYPES),
    description: z.string().nullable(),
    maxConsecutiveRunHours: zPositiveReal,
    requiredRestHours: zPositiveReal,
    runWarningThresholdPct: z
      .number()
      .int()
      .min(1, { error: 'Must be at least 1%' })
      .max(100, { error: 'Must be at most 100%' })
  })
  .partial()
  .refine(data => Object.keys(data).length > 0, {
    error: 'At least one field must be provided'
  })

export type UpdateGeneratorInput = z.input<typeof updateGeneratorSchema>

export const startSessionSchema = z.object({
  generatorId: z.string()
})

export type StartSessionInput = z.input<typeof startSessionSchema>

export const stopSessionSchema = z.object({
  sessionId: z.string()
})

export type StopSessionInput = z.input<typeof stopSessionSchema>
