import {
  insertOrganizationSchema,
  insertInvitationSchema,
  updateOrganizationSchema
} from '../organizations'

describe('insertOrganizationSchema', () => {
  it('accepts non-empty name', () => {
    const result = insertOrganizationSchema.safeParse({ name: 'My Org' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = insertOrganizationSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('trims name whitespace', () => {
    const result = insertOrganizationSchema.safeParse({ name: '  My Org  ' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('My Org')
  })
})

describe('insertInvitationSchema', () => {
  it('accepts valid email', () => {
    const result = insertInvitationSchema.safeParse({
      organizationId: 'org-1',
      inviteeEmail: 'user@example.com'
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = insertInvitationSchema.safeParse({
      organizationId: 'org-1',
      inviteeEmail: 'not-an-email'
    })
    expect(result.success).toBe(false)
  })
})

describe('updateOrganizationSchema', () => {
  it('accepts non-empty name', () => {
    const result = updateOrganizationSchema.safeParse({ name: 'New Name' })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = updateOrganizationSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })
})
