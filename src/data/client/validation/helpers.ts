import { z } from 'zod'

// Error codes are literal markers resolved by `mapZodIssueToError` and
// translated in `translate-mutation-error.ts`. Attach them explicitly so
// these helpers don't silently depend on the fallback heuristic chain.
export const zNonEmptyString = z
  .string()
  .trim()
  .min(1, { error: 'MUST_NOT_BE_EMPTY' })

export const zPositiveReal = z.number().positive({ error: 'MUST_BE_POSITIVE' })

export const zPositiveInt = z
  .number()
  .int({ error: 'MUST_BE_POSITIVE_INT' })
  .positive({ error: 'MUST_BE_POSITIVE_INT' })
