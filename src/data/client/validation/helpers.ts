import { z } from 'zod'

export const zNonEmptyString = z
  .string()
  .trim()
  .min(1, { error: 'Must not be empty' })

export const zPositiveReal = z
  .number()
  .positive({ error: 'Must be greater than 0' })

export const zPositiveInt = z
  .number()
  .int()
  .positive({ error: 'Must be a positive integer' })
