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

import { clientAuthzProvider } from '../provider'

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

// These tests cover the SQLite-specific concerns the dialect-independent
// shared checks-test.ts cannot reach: EXISTS 0/1 → boolean coercion,
// LEFT JOIN orphan-org nullability, and the missing-row path.

describe('getOrgFacts', () => {
  it('returns facts for an existing organization', async () => {
    expect(await clientAuthzProvider.getOrgFacts(IDS.org)).toEqual({
      adminUserId: IDS.adminUser
    })
  })

  it('returns null when the organization does not exist', async () => {
    expect(await clientAuthzProvider.getOrgFacts('ghost-org')).toBeNull()
  })
})

describe('getGeneratorFacts', () => {
  it('coerces the EXISTS subquery to a real boolean (no assignment)', async () => {
    const facts = await clientAuthzProvider.getGeneratorFacts(
      IDS.memberUser,
      IDS.generator
    )
    expect(facts).toEqual({
      orgAdminUserId: IDS.adminUser,
      hasAssignment: false
    })
  })

  it('coerces the EXISTS subquery to a real boolean (with assignment)', async () => {
    seedAssignment(mockTestDb.db)
    const facts = await clientAuthzProvider.getGeneratorFacts(
      IDS.memberUser,
      IDS.generator
    )
    expect(facts).toEqual({
      orgAdminUserId: IDS.adminUser,
      hasAssignment: true
    })
  })

  it('returns orgAdminUserId: null when the generator is orphaned (LEFT JOIN)', async () => {
    dropOrgRow()
    const facts = await clientAuthzProvider.getGeneratorFacts(
      IDS.memberUser,
      IDS.generator
    )
    expect(facts).toEqual({
      orgAdminUserId: null,
      hasAssignment: false
    })
  })

  it('returns null when the generator does not exist', async () => {
    expect(
      await clientAuthzProvider.getGeneratorFacts(IDS.adminUser, 'ghost-gen')
    ).toBeNull()
  })
})
