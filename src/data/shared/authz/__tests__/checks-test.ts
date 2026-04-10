import { createAuthzChecks } from '../checks'
import type {
  AuthzFactsProvider,
  GeneratorAuthzFacts,
  OrgAuthzFacts
} from '../provider'

const ADMIN = 'user-admin'
const MEMBER = 'user-member'
const OUTSIDER = 'user-outsider'
const ORG = 'org-1'
const GENERATOR = 'gen-1'

// Hand-written stub: lets each test describe exactly which facts the provider
// reports without touching any database. Keeps the check layer dialect-free.
function makeProvider(facts: {
  org?: OrgAuthzFacts | null
  generator?: GeneratorAuthzFacts | null
}): AuthzFactsProvider {
  return {
    async getOrgFacts() {
      return facts.org ?? null
    },
    async getGeneratorFacts() {
      return facts.generator ?? null
    }
  }
}

describe('isOrgAdmin', () => {
  it('returns true when the facts report a matching admin', async () => {
    const checks = createAuthzChecks(
      makeProvider({ org: { adminUserId: ADMIN } })
    )
    expect(await checks.isOrgAdmin(ADMIN, ORG)).toBe(true)
  })

  it('returns false when the organization does not exist', async () => {
    const checks = createAuthzChecks(makeProvider({ org: null }))
    expect(await checks.isOrgAdmin(ADMIN, ORG)).toBe(false)
  })

  it('returns false when the organization has no admin', async () => {
    const checks = createAuthzChecks(
      makeProvider({ org: { adminUserId: null } })
    )
    expect(await checks.isOrgAdmin(ADMIN, ORG)).toBe(false)
  })

  it('returns false for a non-admin user', async () => {
    const checks = createAuthzChecks(
      makeProvider({ org: { adminUserId: ADMIN } })
    )
    expect(await checks.isOrgAdmin(MEMBER, ORG)).toBe(false)
  })
})

describe('isGeneratorOrgAdmin', () => {
  it('returns true when the facts report the user as the generator org admin', async () => {
    const checks = createAuthzChecks(
      makeProvider({
        generator: { orgAdminUserId: ADMIN, hasAssignment: false }
      })
    )
    expect(await checks.isGeneratorOrgAdmin(ADMIN, GENERATOR)).toBe(true)
  })

  it('returns false when the generator does not exist', async () => {
    const checks = createAuthzChecks(makeProvider({ generator: null }))
    expect(await checks.isGeneratorOrgAdmin(ADMIN, GENERATOR)).toBe(false)
  })

  it('returns false when the generator is orphaned (null org admin)', async () => {
    const checks = createAuthzChecks(
      makeProvider({
        generator: { orgAdminUserId: null, hasAssignment: false }
      })
    )
    expect(await checks.isGeneratorOrgAdmin(ADMIN, GENERATOR)).toBe(false)
  })

  it('returns false for a non-admin even when the user has an assignment', async () => {
    const checks = createAuthzChecks(
      makeProvider({
        generator: { orgAdminUserId: ADMIN, hasAssignment: true }
      })
    )
    expect(await checks.isGeneratorOrgAdmin(MEMBER, GENERATOR)).toBe(false)
  })
})

describe('canAccessGenerator', () => {
  it('grants access to the org admin without an assignment', async () => {
    const checks = createAuthzChecks(
      makeProvider({
        generator: { orgAdminUserId: ADMIN, hasAssignment: false }
      })
    )
    expect(await checks.canAccessGenerator(ADMIN, GENERATOR)).toBe(true)
  })

  it('grants access to a non-admin with an assignment', async () => {
    const checks = createAuthzChecks(
      makeProvider({
        generator: { orgAdminUserId: ADMIN, hasAssignment: true }
      })
    )
    expect(await checks.canAccessGenerator(MEMBER, GENERATOR)).toBe(true)
  })

  it('denies a non-admin without an assignment', async () => {
    const checks = createAuthzChecks(
      makeProvider({
        generator: { orgAdminUserId: ADMIN, hasAssignment: false }
      })
    )
    expect(await checks.canAccessGenerator(OUTSIDER, GENERATOR)).toBe(false)
  })

  it('returns false when the generator does not exist', async () => {
    const checks = createAuthzChecks(makeProvider({ generator: null }))
    expect(await checks.canAccessGenerator(ADMIN, GENERATOR)).toBe(false)
  })

  it('grants access to an orphan generator when the user has an assignment', async () => {
    const checks = createAuthzChecks(
      makeProvider({
        generator: { orgAdminUserId: null, hasAssignment: true }
      })
    )
    expect(await checks.canAccessGenerator(MEMBER, GENERATOR)).toBe(true)
  })

  it('denies access to an orphan generator without an assignment', async () => {
    const checks = createAuthzChecks(
      makeProvider({
        generator: { orgAdminUserId: null, hasAssignment: false }
      })
    )
    expect(await checks.canAccessGenerator(MEMBER, GENERATOR)).toBe(false)
  })
})
