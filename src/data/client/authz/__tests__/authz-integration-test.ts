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

// Stub out the production PowerSync database module so jest does not try to
// load the native op-sqlite binary. The tests below go through the factory
// directly with the in-memory test db, so nothing ever reads the stub.
jest.mock('@/lib/powersync/database', () => ({ db: null, powersync: null }))

import { createClientAuthzProvider } from '../provider'

let testDb: Awaited<ReturnType<typeof createTestDatabase>>
let authzProvider: ReturnType<typeof createClientAuthzProvider>

beforeAll(async () => {
  testDb = await createTestDatabase()
  authzProvider = createClientAuthzProvider(testDb.db)
})

beforeEach(() => {
  resetDatabase(testDb.sqlite)
  seedBaseScenario(testDb.db)
  seedGenerator(testDb.db)
})

afterAll(() => closeDatabase(testDb.sqlite))

// Remove the organization row while keeping the generator in place, so we can
// exercise the LEFT JOIN "orphan generator" code path without fighting the
// Drizzle foreign-key-agnostic client schema.
function dropOrgRow() {
  testDb.db.delete(organizations).where(eq(organizations.id, IDS.org)).run()
}

// These tests cover the SQLite-specific concerns the dialect-independent
// shared checks-test.ts cannot reach: EXISTS 0/1 → boolean coercion,
// LEFT JOIN orphan-org nullability, and the missing-row path.

describe('getOrgFacts', () => {
  it('returns facts for an existing organization', async () => {
    expect(await authzProvider.getOrgFacts(IDS.org)).toEqual({
      adminUserId: IDS.adminUser
    })
  })

  it('returns null when the organization does not exist', async () => {
    expect(await authzProvider.getOrgFacts('ghost-org')).toBeNull()
  })
})

describe('getGeneratorFacts', () => {
  it('coerces the EXISTS subquery to a real boolean (no assignment)', async () => {
    const facts = await authzProvider.getGeneratorFacts(
      IDS.memberUser,
      IDS.generator
    )
    expect(facts).toEqual({
      orgAdminUserId: IDS.adminUser,
      hasAssignment: false
    })
  })

  it('coerces the EXISTS subquery to a real boolean (with assignment)', async () => {
    seedAssignment(testDb.db)
    const facts = await authzProvider.getGeneratorFacts(
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
    const facts = await authzProvider.getGeneratorFacts(
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
      await authzProvider.getGeneratorFacts(IDS.adminUser, 'ghost-gen')
    ).toBeNull()
  })
})
