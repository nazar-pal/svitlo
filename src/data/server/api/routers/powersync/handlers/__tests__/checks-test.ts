import { isOwnerOrGeneratorAdmin } from '../checks'

const ADMIN = 'user-admin'
const OWNER = 'user-owner'
const OUTSIDER = 'user-outsider'

// `isOwnerOrGeneratorAdmin` is the server-only gate layered on top of the
// shared policy: the shared rule already allowed anyone with generator
// access, so this narrows it to the row's owner or the generator's org
// admin. It reads the `authz.generator` fact the calling decision already
// resolved, so the fact can arrive as null (generator missing) or undefined
// (plan entry skipped) — both must fail closed for a non-owner.
describe('isOwnerOrGeneratorAdmin', () => {
  it('allows the row owner regardless of the generator fact', () => {
    expect(isOwnerOrGeneratorAdmin(OWNER, OWNER, null)).toBe(true)
    expect(isOwnerOrGeneratorAdmin(OWNER, OWNER, undefined)).toBe(true)
  })

  it("allows the generator org admin acting on someone else's row", () => {
    expect(
      isOwnerOrGeneratorAdmin(ADMIN, OWNER, {
        orgAdminUserId: ADMIN,
        hasAssignment: false
      })
    ).toBe(true)
  })

  it('denies a merely-assigned non-owner, unlike the shared policy', () => {
    expect(
      isOwnerOrGeneratorAdmin(OUTSIDER, OWNER, {
        orgAdminUserId: ADMIN,
        hasAssignment: true
      })
    ).toBe(false)
  })

  it('denies a non-owner when the generator fact is missing', () => {
    expect(isOwnerOrGeneratorAdmin(OUTSIDER, OWNER, null)).toBe(false)
    expect(isOwnerOrGeneratorAdmin(OUTSIDER, OWNER, undefined)).toBe(false)
  })

  it('denies a non-owner on an orphan generator with no org admin', () => {
    expect(
      isOwnerOrGeneratorAdmin(OUTSIDER, OWNER, {
        orgAdminUserId: null,
        hasAssignment: true
      })
    ).toBe(false)
  })
})
