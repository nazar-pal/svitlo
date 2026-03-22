import { z } from 'zod'

import {
  zNonEmptyString,
  zPositiveReal,
  zPositiveInt,
  flattenZodErrors
} from '../helpers'

describe('zNonEmptyString', () => {
  it('accepts a non-empty string', () => {
    expect(zNonEmptyString.safeParse('hello').success).toBe(true)
  })

  it('trims whitespace', () => {
    const result = zNonEmptyString.safeParse('  hello  ')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('hello')
  })

  it('rejects empty string', () => {
    expect(zNonEmptyString.safeParse('').success).toBe(false)
  })

  it('rejects whitespace-only string', () => {
    expect(zNonEmptyString.safeParse('   ').success).toBe(false)
  })
})

describe('zPositiveReal', () => {
  it('accepts positive decimals', () => {
    expect(zPositiveReal.safeParse(1.5).success).toBe(true)
  })

  it('accepts positive integers', () => {
    expect(zPositiveReal.safeParse(1).success).toBe(true)
  })

  it('rejects zero', () => {
    expect(zPositiveReal.safeParse(0).success).toBe(false)
  })

  it('rejects negative numbers', () => {
    expect(zPositiveReal.safeParse(-1).success).toBe(false)
  })
})

describe('zPositiveInt', () => {
  it('accepts positive integers', () => {
    expect(zPositiveInt.safeParse(1).success).toBe(true)
  })

  it('rejects zero', () => {
    expect(zPositiveInt.safeParse(0).success).toBe(false)
  })

  it('rejects negative integers', () => {
    expect(zPositiveInt.safeParse(-1).success).toBe(false)
  })

  it('rejects non-integer positive numbers', () => {
    expect(zPositiveInt.safeParse(1.5).success).toBe(false)
  })
})

describe('flattenZodErrors', () => {
  it('flattens field errors into Record<string, string>', () => {
    const schema = z.object({
      name: z.string().min(1, 'required'),
      age: z.number().positive('must be positive')
    })
    const result = schema.safeParse({ name: '', age: -1 })
    if (result.error) {
      const flat = flattenZodErrors(result.error)
      expect(flat).toHaveProperty('name')
      expect(flat).toHaveProperty('age')
      expect(typeof flat.name).toBe('string')
      expect(typeof flat.age).toBe('string')
    }
  })

  it('takes first message when field has multiple errors', () => {
    const schema = z.object({
      value: z
        .string()
        .min(3, 'too short')
        .includes('@', { message: 'needs @' })
    })
    const result = schema.safeParse({ value: '' })
    if (result.error) {
      const flat = flattenZodErrors(result.error)
      expect(flat.value).toBeDefined()
      expect(typeof flat.value).toBe('string')
    }
  })

  it('returns empty object for error with no field errors', () => {
    // Refinement errors without a path don't appear in fieldErrors
    const schema = z
      .object({ a: z.string(), b: z.string() })
      .refine(d => d.a === d.b, 'must match')
    const result = schema.safeParse({ a: 'x', b: 'y' })
    if (result.error) {
      const flat = flattenZodErrors(result.error)
      // The refinement error has no field path, so it won't appear
      expect(Object.keys(flat).length).toBe(0)
    }
  })
})
