import type { z } from 'zod'

import {
  PARAM_FREE_MUTATION_ERROR_CODES,
  type MutationError,
  type ParamFreeMutationErrorCode
} from './errors'
import type { MutationResult } from './result'

/**
 * Map a single Zod issue to a structured MutationError.
 *
 * Schemas prefer explicit code markers: e.g. `.min(1, { error: 'ENTER_EMAIL' })`
 * sets `issue.message` to the literal code string. When that isn't set, we
 * fall back to inferring from the issue's structural fields (`code`, `origin`,
 * `format`). Unknown issues default to MUST_NOT_BE_EMPTY — the safest generic.
 */
export function mapZodIssueToError(issue: z.core.$ZodIssue): MutationError {
  if (
    typeof issue.message === 'string' &&
    issue.message in PARAM_FREE_MUTATION_ERROR_CODES
  )
    // Cast to MutationError: `code: ParamFreeMutationErrorCode` is a union
    // type, but MutationError is a distributive union where each branch
    // has a literal `code`. TS can't narrow without the cast.
    return {
      code: issue.message as ParamFreeMutationErrorCode
    } as MutationError

  if (issue.code === 'too_small') {
    if (issue.origin === 'string') return { code: 'MUST_NOT_BE_EMPTY' }
    if (issue.origin === 'number') return { code: 'MUST_BE_POSITIVE' }
  }

  if (issue.code === 'invalid_type') {
    if (issue.expected === 'int') return { code: 'MUST_BE_POSITIVE_INT' }
  }

  if (issue.code === 'invalid_format' && issue.format === 'email')
    return { code: 'MUST_BE_VALID_EMAIL' }

  return { code: 'MUST_NOT_BE_EMPTY' }
}

/**
 * Defense-in-depth helper: when a mutation is called outside of `useForm`
 * (which already validates), a `safeParse` failure inside the mutation still
 * needs to produce a structured result. This wraps the first issue.
 */
export function failFromZod(error: z.ZodError): MutationResult {
  return {
    ok: false,
    error: mapZodIssueToError(error.issues[0])
  }
}
