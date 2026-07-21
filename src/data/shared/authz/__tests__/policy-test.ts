import {
  canAccessGenerator,
  canAccessGeneratorFact,
  isOrgAdmin
} from '../policy'

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

describe('canAccessGeneratorFact', () => {
  it('grants the org admin from the fact row', () => {
    expect(
      canAccessGeneratorFact(ADMIN, {
        orgAdminUserId: ADMIN,
        hasAssignment: false
      })
    ).toBe(true)
  })

  it('grants a non-admin assigned in the fact row', () => {
    expect(
      canAccessGeneratorFact(MEMBER, {
        orgAdminUserId: ADMIN,
        hasAssignment: true
      })
    ).toBe(true)
  })

  it('denies a non-admin with no assignment in the fact row', () => {
    expect(
      canAccessGeneratorFact(MEMBER, {
        orgAdminUserId: ADMIN,
        hasAssignment: false
      })
    ).toBe(false)
  })

  it('grants an assigned user on an orphan generator (null org admin)', () => {
    expect(
      canAccessGeneratorFact(MEMBER, {
        orgAdminUserId: null,
        hasAssignment: true
      })
    ).toBe(true)
  })

  it('denies an unassigned user on an orphan generator', () => {
    expect(
      canAccessGeneratorFact(MEMBER, {
        orgAdminUserId: null,
        hasAssignment: false
      })
    ).toBe(false)
  })

  it('denies when the generator was not found (null fact)', () => {
    expect(canAccessGeneratorFact(ADMIN, null)).toBe(false)
  })

  it('denies when the plan entry was skipped (undefined fact)', () => {
    expect(canAccessGeneratorFact(ADMIN, undefined)).toBe(false)
  })
})
