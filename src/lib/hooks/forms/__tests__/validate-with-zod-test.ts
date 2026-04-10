import { z } from 'zod'

import { validateWithZod } from '../validate-with-zod'

describe('validateWithZod', () => {
  it('returns ok with parsed data on success', () => {
    const schema = z.object({ name: z.string().min(1) })
    const result = validateWithZod(schema, { name: 'Alice' })
    expect(result).toEqual({ ok: true, data: { name: 'Alice' } })
  })

  it('returns flattened field errors on a per-field zod failure', () => {
    const schema = z.object({
      name: z.string().min(1, { message: 'required' }),
      age: z.number().int().positive({ message: 'must be positive' })
    })
    const result = validateWithZod(schema, { name: '', age: -1 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.fieldErrors).toEqual({
      name: 'required',
      age: 'must be positive'
    })
    expect(result.formError).toBeUndefined()
  })

  it('surfaces a root-level refine message as formError', () => {
    const schema = z
      .object({ start: z.number(), end: z.number() })
      .refine(v => v.end > v.start, { message: 'end must be after start' })
    const result = validateWithZod(schema, { start: 5, end: 1 })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.formError).toBe('end must be after start')
  })
})
