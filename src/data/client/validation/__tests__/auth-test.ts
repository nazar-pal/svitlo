import { signInSchema, signUpSchema } from '../auth'

describe('signInSchema', () => {
  it('accepts valid input', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: 'password123'
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty email', () => {
    const result = signInSchema.safeParse({
      email: '',
      password: 'password123'
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = signInSchema.safeParse({
      email: 'not-an-email',
      password: 'password123'
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty password', () => {
    const result = signInSchema.safeParse({
      email: 'user@example.com',
      password: ''
    })
    expect(result.success).toBe(false)
  })

  it('trims email whitespace', () => {
    const result = signInSchema.safeParse({
      email: '  user@example.com  ',
      password: 'password123'
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('user@example.com')
  })
})

describe('signUpSchema', () => {
  it('accepts valid input', () => {
    const result = signUpSchema.safeParse({
      name: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    })
    expect(result.success).toBe(true)
  })

  it('rejects mismatched passwords', () => {
    const result = signUpSchema.safeParse({
      name: 'Test User',
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'different'
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map(i => i.path.join('.'))
      expect(paths).toContain('confirmPassword')
    }
  })

  it('rejects password shorter than 8 characters', () => {
    const result = signUpSchema.safeParse({
      name: 'Test User',
      email: 'user@example.com',
      password: '1234567',
      confirmPassword: '1234567'
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = signUpSchema.safeParse({
      name: '',
      email: 'user@example.com',
      password: 'password123',
      confirmPassword: 'password123'
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = signUpSchema.safeParse({
      name: 'Test User',
      email: 'bad',
      password: 'password123',
      confirmPassword: 'password123'
    })
    expect(result.success).toBe(false)
  })
})
