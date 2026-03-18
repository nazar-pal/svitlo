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

export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const flat = z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >
  const mapped: Record<string, string> = {}
  for (const [key, msgs] of Object.entries(flat))
    if (msgs?.[0]) mapped[key] = msgs[0]
  return mapped
}
