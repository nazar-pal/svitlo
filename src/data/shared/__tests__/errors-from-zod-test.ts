import { z } from 'zod'

import { failFromZod, mapZodIssueToError } from '../errors-from-zod'

function firstIssueOf(result: z.ZodSafeParseResult<unknown>): z.core.$ZodIssue {
  if (result.success) throw new Error('expected parse to fail')
  return result.error.issues[0]
}

describe('mapZodIssueToError', () => {
  describe('explicit message codes', () => {
    it('recognizes a known param-free code embedded via { error }', () => {
      const schema = z.string().min(1, { error: 'ENTER_EMAIL' })
      const issue = firstIssueOf(schema.safeParse(''))
      expect(mapZodIssueToError(issue)).toEqual({ code: 'ENTER_EMAIL' })
    })

    it('recognizes custom-issue message codes raised via ctx.addIssue', () => {
      const schema = z.object({ a: z.string() }).superRefine((_, ctx) => {
        ctx.addIssue({
          code: 'custom',
          path: ['a'],
          message: 'REQUIRED_FOR_TRIGGER_TYPE'
        })
      })
      const issue = firstIssueOf(schema.safeParse({ a: 'x' }))
      expect(mapZodIssueToError(issue)).toEqual({
        code: 'REQUIRED_FOR_TRIGGER_TYPE'
      })
    })

    it('does not treat arbitrary free-form messages as codes', () => {
      // A schema whose default message is not a known code — must fall
      // through to the structural heuristics instead of producing a bogus
      // `{ code: 'arbitrary …' }`.
      const schema = z.string().min(1, { error: 'definitely not a code' })
      const issue = firstIssueOf(schema.safeParse(''))
      expect(mapZodIssueToError(issue)).toEqual({ code: 'MUST_NOT_BE_EMPTY' })
    })
  })

  describe('structural heuristics', () => {
    it('maps too_small on a string to MUST_NOT_BE_EMPTY', () => {
      const issue = firstIssueOf(z.string().min(1).safeParse(''))
      expect(mapZodIssueToError(issue)).toEqual({ code: 'MUST_NOT_BE_EMPTY' })
    })

    it('maps too_small on a number to MUST_BE_POSITIVE', () => {
      const issue = firstIssueOf(z.number().positive().safeParse(0))
      expect(mapZodIssueToError(issue)).toEqual({ code: 'MUST_BE_POSITIVE' })
    })

    it('maps invalid_type with expected=int to MUST_BE_POSITIVE_INT', () => {
      const issue = firstIssueOf(z.number().int().safeParse(1.5))
      expect(mapZodIssueToError(issue)).toEqual({
        code: 'MUST_BE_POSITIVE_INT'
      })
    })

    it('maps invalid_format email to MUST_BE_VALID_EMAIL', () => {
      const issue = firstIssueOf(z.email().safeParse('not-an-email'))
      expect(mapZodIssueToError(issue)).toEqual({ code: 'MUST_BE_VALID_EMAIL' })
    })

    it('falls back to MUST_NOT_BE_EMPTY for unrecognized issues', () => {
      const issue = firstIssueOf(z.boolean().safeParse('not-a-bool'))
      expect(mapZodIssueToError(issue)).toEqual({ code: 'MUST_NOT_BE_EMPTY' })
    })
  })
})

describe('failFromZod', () => {
  it('wraps the first issue as a structured MutationResult', () => {
    const schema = z.object({
      name: z.string().min(1, { error: 'ENTER_NAME' }),
      email: z.string().min(1, { error: 'ENTER_EMAIL' })
    })
    const parsed = schema.safeParse({ name: '', email: '' })
    if (parsed.success) throw new Error('expected parse to fail')

    expect(failFromZod(parsed.error)).toEqual({
      ok: false,
      error: { code: 'ENTER_NAME' }
    })
  })
})
