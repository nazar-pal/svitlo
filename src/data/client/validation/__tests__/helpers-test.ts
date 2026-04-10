import { zNonEmptyString, zPositiveInt, zPositiveReal } from '../helpers'

describe('zNonEmptyString', () => {
  it('accepts a non-empty string', () => {
    expect(zNonEmptyString.safeParse('hello').success).toBe(true)
  })

  it('trims whitespace before the length check', () => {
    const result = zNonEmptyString.safeParse('  hello  ')
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toBe('hello')
  })

  it('rejects an empty string with a too_small issue', () => {
    const result = zNonEmptyString.safeParse('')
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0].code).toBe('too_small')
  })

  it('rejects whitespace-only as empty after trim', () => {
    expect(zNonEmptyString.safeParse('   ').success).toBe(false)
  })
})

describe('zPositiveReal', () => {
  it('accepts a positive number', () => {
    expect(zPositiveReal.safeParse(1.5).success).toBe(true)
  })

  it('rejects zero and negatives with a too_small issue', () => {
    const result = zPositiveReal.safeParse(0)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0].code).toBe('too_small')
  })
})

describe('zPositiveInt', () => {
  it('accepts a positive integer', () => {
    expect(zPositiveInt.safeParse(5).success).toBe(true)
  })

  it('rejects a floating-point number with an invalid_type issue', () => {
    const result = zPositiveInt.safeParse(1.5)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues[0].code).toBe('invalid_type')
  })
})
