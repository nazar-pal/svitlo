import type { z } from 'zod'

import { flattenZodErrors } from '@/data/client/validation/helpers'

import type { BuildResult } from './use-form'

export function validateWithZod<TIn, TOut>(
  schema: z.ZodType<TOut, TIn>,
  input: TIn
): BuildResult<TOut> {
  const parsed = schema.safeParse(input)
  if (parsed.success) return { ok: true, data: parsed.data }

  const fieldErrors = flattenZodErrors(parsed.error)
  const formError = parsed.error.issues.find(
    issue => issue.path.length === 0
  )?.message

  return { ok: false, fieldErrors, formError }
}
