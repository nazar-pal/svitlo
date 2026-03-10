import { z } from 'zod'

export const zNonEmptyString = z.string().trim().min(1, 'Must not be empty')

export const zPositiveReal = z.number().positive('Must be greater than 0')

export const zPositiveInt = z
  .number()
  .int()
  .positive('Must be a positive integer')
