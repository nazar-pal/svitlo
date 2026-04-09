import { createTestDatabase, resetDatabase, closeDatabase } from './test-db'
import { IDS, seedBaseScenario, seedGenerator, seedAssignment } from './seed'

let mockTestDb: Awaited<ReturnType<typeof createTestDatabase>>

beforeAll(async () => {
  mockTestDb = await createTestDatabase()
})

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockTestDb.db
  },
  get powersync() {
    return mockTestDb.powersync
  }
}))

jest.mock('expo-crypto', () => ({ randomUUID: () => 'mock-uuid' }))
jest.mock('@/lib/i18n', () => ({ t: (key: string) => key }))
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }))

import {
  isOrgAdmin,
  getGeneratorOrg,
  isGeneratorOrgAdmin,
  canAccessGenerator
} from '../helpers'

beforeEach(() => {
  resetDatabase(mockTestDb.sqlite)
  seedBaseScenario(mockTestDb.db)
  seedGenerator(mockTestDb.db)
})

afterAll(() => closeDatabase(mockTestDb.sqlite))

// ── isOrgAdmin ──────────────────────────────────────────────────────────────

describe('isOrgAdmin', () => {
  it('returns true for the org admin', async () => {
    expect(await isOrgAdmin(IDS.adminUser, IDS.org)).toBe(true)
  })

  it('returns false for a member', async () => {
    expect(await isOrgAdmin(IDS.memberUser, IDS.org)).toBe(false)
  })

  it('returns false for an outsider', async () => {
    expect(await isOrgAdmin(IDS.outsiderUser, IDS.org)).toBe(false)
  })

  it('returns false for a nonexistent org', async () => {
    expect(await isOrgAdmin(IDS.adminUser, 'nonexistent')).toBe(false)
  })
})

// ── getGeneratorOrg ─────────────────────────────────────────────────────────

describe('getGeneratorOrg', () => {
  it('returns the organizationId for an existing generator', async () => {
    const result = await getGeneratorOrg(IDS.generator)
    expect(result).toEqual({ organizationId: IDS.org })
  })

  it('returns null for a nonexistent generator', async () => {
    const result = await getGeneratorOrg('nonexistent')
    expect(result).toBeNull()
  })
})

// ── isGeneratorOrgAdmin ─────────────────────────────────────────────────────

describe('isGeneratorOrgAdmin', () => {
  it('returns true when user is admin of the generator org', async () => {
    expect(await isGeneratorOrgAdmin(IDS.adminUser, IDS.generator)).toBe(true)
  })

  it('returns false for a member', async () => {
    expect(await isGeneratorOrgAdmin(IDS.memberUser, IDS.generator)).toBe(false)
  })

  it('returns false for nonexistent generator', async () => {
    expect(await isGeneratorOrgAdmin(IDS.adminUser, 'nonexistent')).toBe(false)
  })
})

// ── canAccessGenerator ──────────────────────────────────────────────────────

describe('canAccessGenerator', () => {
  it('returns true for org admin (no assignment needed)', async () => {
    expect(await canAccessGenerator(IDS.adminUser, IDS.generator)).toBe(true)
  })

  it('returns true for assigned member', async () => {
    seedAssignment(mockTestDb.db)
    expect(await canAccessGenerator(IDS.memberUser, IDS.generator)).toBe(true)
  })

  it('returns false for unassigned member', async () => {
    expect(await canAccessGenerator(IDS.memberUser, IDS.generator)).toBe(false)
  })

  it('returns false for outsider', async () => {
    expect(await canAccessGenerator(IDS.outsiderUser, IDS.generator)).toBe(
      false
    )
  })

  it('returns false for nonexistent generator', async () => {
    expect(await canAccessGenerator(IDS.adminUser, 'nonexistent')).toBe(false)
  })
})
