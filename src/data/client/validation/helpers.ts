import { z } from 'zod'

import { t } from '@/lib/i18n'

export const zNonEmptyString = z
  .string()
  .trim()
  .min(1, { error: () => t('validation.mustNotBeEmpty') })

export const zPositiveReal = z
  .number()
  .positive({ error: () => t('validation.mustBePositive') })

export const zPositiveInt = z
  .number()
  .int()
  .positive({ error: () => t('validation.mustBePositiveInt') })

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
