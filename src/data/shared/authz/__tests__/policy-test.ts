import { canAccessGenerator, isOrgAdmin } from '../policy'

const ADMIN = 'user-admin'
const MEMBER = 'user-member'

describe('isOrgAdmin', () => {
  it('returns true when the org admin matches the user', () => {
    expect(isOrgAdmin(ADMIN, ADMIN)).toBe(true)
  })

  it('returns false for a different user', () => {
    expect(isOrgAdmin(MEMBER, ADMIN)).toBe(false)
  })

  it('returns false when the org has no admin', () => {
    expect(isOrgAdmin(ADMIN, null)).toBe(false)
  })
})

describe('canAccessGenerator', () => {
  it('grants access to the org admin even without an assignment', () => {
    expect(canAccessGenerator(ADMIN, ADMIN, false)).toBe(true)
  })

  it('grants access to a non-admin with an assignment', () => {
    expect(canAccessGenerator(MEMBER, ADMIN, true)).toBe(true)
  })

  it('denies a non-admin without an assignment', () => {
    expect(canAccessGenerator(MEMBER, ADMIN, false)).toBe(false)
  })

  it('denies access when no admin and no assignment', () => {
    expect(canAccessGenerator(MEMBER, null, false)).toBe(false)
  })
})
