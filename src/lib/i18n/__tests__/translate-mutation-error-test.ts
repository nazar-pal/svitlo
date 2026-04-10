import {
  PARAM_FREE_MUTATION_ERROR_CODES,
  type MutationError,
  type ParamFreeMutationErrorCode
} from '@/data/shared/errors'

import { translateMutationError } from '../translate-mutation-error'

// Build one representative error per code: all param-free codes from the
// runtime catalog, plus hand-crafted instances for the two parameterized
// codes. Missing a code here triggers a TypeScript error via `satisfies`.
const SAMPLE_ERRORS: MutationError[] = [
  ...(
    Object.keys(PARAM_FREE_MUTATION_ERROR_CODES) as ParamFreeMutationErrorCode[]
  ).map(code => ({ code }) as MutationError),
  {
    code: 'MAINTENANCE_TASK_VALIDATION_FAILED',
    params: { taskName: 'Air Filter' }
  },
  { code: 'AUTH_FAILED', params: { message: 'Server is down' } }
]

describe('translateMutationError', () => {
  it('returns a non-empty string for every MutationErrorCode', () => {
    // Catches typos or missing keys in en.ts/uk.ts that the compile-time
    // `satisfies never` exhaustiveness guard can't see — those are
    // runtime-only failures without this sweep.
    for (const error of SAMPLE_ERRORS) {
      const message = translateMutationError(error)
      expect(typeof message).toBe('string')
      expect(message.length).toBeGreaterThan(0)
      // i18next returns the key path verbatim when a translation is missing;
      // a valid translation never contains a dotted `errors.*` or
      // `validation.*` segment.
      expect(message).not.toMatch(/^errors\./)
      expect(message).not.toMatch(/^validation\./)
    }
  })

  it('interpolates parameterized codes into the translated message', () => {
    const message = translateMutationError({
      code: 'MAINTENANCE_TASK_VALIDATION_FAILED',
      params: { taskName: 'Oil Change' }
    })
    expect(message).toContain('Oil Change')
  })

  it('passes AUTH_FAILED provider messages through verbatim', () => {
    const message = translateMutationError({
      code: 'AUTH_FAILED',
      params: { message: 'Better Auth said no' }
    })
    expect(message).toBe('Better Auth said no')
  })
})
