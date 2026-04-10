import { eq } from 'drizzle-orm'

import { organizations } from '@/data/client/db-schema/organizations'
import {
  closeDatabase,
  createTestDatabase,
  resetDatabase
} from '@/data/client/mutations/__tests__/test-db'
import {
  IDS,
  seedAssignment,
  seedBaseScenario,
  seedGenerator
} from '@/data/client/mutations/__tests__/seed'

let mockTestDb: Awaited<ReturnType<typeof createTestDatabase>>

beforeAll(async () => {
  mockTestDb = await createTestDatabase()
})

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockTestDb.db
  }
}))

import { canAccessGenerator, isGeneratorOrgAdmin, isOrgAdmin } from '../index'

beforeEach(() => {
  resetDatabase(mockTestDb.sqlite)
  seedBaseScenario(mockTestDb.db)
  seedGenerator(mockTestDb.db)
})

afterAll(() => closeDatabase(mockTestDb.sqlite))

// Remove the organization row while keeping the generator in place, so we can
// exercise the LEFT JOIN "orphan generator" code path without fighting the
// Drizzle foreign-key-agnostic client schema.
function dropOrgRow() {
  mockTestDb.db.delete(organizations).where(eq(organizations.id, IDS.org)).run()
}

// ── isOrgAdmin ──────────────────────────────────────────────────────────────

describe('isOrgAdmin', () => {
  it('returns true for the org admin', async () => {
    expect(await isOrgAdmin(IDS.adminUser, IDS.org)).toBe(true)
  })

  it('returns false for a non-admin member of the same org', async () => {
    expect(await isOrgAdmin(IDS.memberUser, IDS.org)).toBe(false)
  })

  it('returns false for an unrelated user', async () => {
    expect(await isOrgAdmin(IDS.outsiderUser, IDS.org)).toBe(false)
  })

  it('returns false when the org does not exist', async () => {
    expect(await isOrgAdmin(IDS.adminUser, 'ghost-org')).toBe(false)
  })
})

// ── isGeneratorOrgAdmin ─────────────────────────────────────────────────────

describe('isGeneratorOrgAdmin', () => {
  it('returns true for the org admin of the generator', async () => {
    expect(await isGeneratorOrgAdmin(IDS.adminUser, IDS.generator)).toBe(true)
  })

  it('returns false for an assigned non-admin member', async () => {
    seedAssignment(mockTestDb.db)
    expect(await isGeneratorOrgAdmin(IDS.memberUser, IDS.generator)).toBe(false)
  })

  it('returns false for an unrelated user', async () => {
    expect(await isGeneratorOrgAdmin(IDS.outsiderUser, IDS.generator)).toBe(
      false
    )
  })

  it('returns false when the generator does not exist', async () => {
    expect(await isGeneratorOrgAdmin(IDS.adminUser, 'ghost-gen')).toBe(false)
  })

  it('returns false when the generator exists but its org row is missing', async () => {
    dropOrgRow()
    expect(await isGeneratorOrgAdmin(IDS.adminUser, IDS.generator)).toBe(false)
  })
})

// ── canAccessGenerator ──────────────────────────────────────────────────────

describe('canAccessGenerator', () => {
  it('returns true for the org admin without any assignment', async () => {
    expect(await canAccessGenerator(IDS.adminUser, IDS.generator)).toBe(true)
  })

  it('returns true for a non-admin member who has an assignment', async () => {
    seedAssignment(mockTestDb.db)
    expect(await canAccessGenerator(IDS.memberUser, IDS.generator)).toBe(true)
  })

  it('returns false for a non-admin member without an assignment', async () => {
    expect(await canAccessGenerator(IDS.memberUser, IDS.generator)).toBe(false)
  })

  it('returns false when the generator does not exist', async () => {
    expect(await canAccessGenerator(IDS.adminUser, 'ghost-gen')).toBe(false)
  })

  it('returns false for an unassigned user when the org row is missing', async () => {
    dropOrgRow()
    expect(await canAccessGenerator(IDS.memberUser, IDS.generator)).toBe(false)
  })

  it('returns true when the org row is missing but the user has an assignment', async () => {
    seedAssignment(mockTestDb.db)
    dropOrgRow()
    expect(await canAccessGenerator(IDS.memberUser, IDS.generator)).toBe(true)
  })
})
