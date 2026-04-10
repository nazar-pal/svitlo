import {
  IDS,
  seedAssignment,
  seedBaseScenario
} from '@/data/server/api/routers/powersync/__tests__/seed-server'
import {
  closeServerDatabase,
  createTestServerDatabase,
  resetServerDatabase
} from '@/data/server/api/routers/powersync/__tests__/test-server-db'

import { createServerAuthzProvider } from '../provider'

let testDb: Awaited<ReturnType<typeof createTestServerDatabase>>

beforeAll(async () => {
  testDb = await createTestServerDatabase()
})

beforeEach(async () => {
  await resetServerDatabase()
  await seedBaseScenario(testDb.db)
})

afterAll(async () => {
  await closeServerDatabase()
})

// These tests cover the PG-specific concerns the dialect-independent shared
// checks-test.ts cannot reach: EXISTS → real boolean handling, LEFT JOIN
// nullability, and the not-found path. Logic (admin vs. member, assignment
// combinations) is covered in src/data/shared/authz/__tests__/checks-test.ts.

function provider() {
  // Cast matches the handlers-integration-test.ts approach: the PGlite-backed
  // drizzle instance is structurally compatible with the Neon-backed one.
  return createServerAuthzProvider(
    testDb.db as unknown as Parameters<typeof createServerAuthzProvider>[0]
  )
}

describe('getOrgFacts', () => {
  it('returns facts for an existing organization', async () => {
    expect(await provider().getOrgFacts(IDS.org)).toEqual({
      adminUserId: IDS.admin
    })
  })

  it('returns null when the organization does not exist', async () => {
    expect(
      await provider().getOrgFacts('00000000-0000-0000-0000-0000000000ff')
    ).toBeNull()
  })
})

describe('getGeneratorFacts', () => {
  it('coerces the EXISTS subquery to a real boolean (no assignment)', async () => {
    const facts = await provider().getGeneratorFacts(IDS.member, IDS.generator)
    expect(facts).toEqual({
      orgAdminUserId: IDS.admin,
      hasAssignment: false
    })
  })

  it('coerces the EXISTS subquery to a real boolean (with assignment)', async () => {
    await seedAssignment(testDb.db)
    const facts = await provider().getGeneratorFacts(IDS.member, IDS.generator)
    expect(facts).toEqual({
      orgAdminUserId: IDS.admin,
      hasAssignment: true
    })
  })

  it('returns null when the generator does not exist', async () => {
    expect(
      await provider().getGeneratorFacts(
        IDS.admin,
        '00000000-0000-0000-0000-0000000000ff'
      )
    ).toBeNull()
  })

  // Postgres's onDelete: 'restrict' FK prevents constructing a generator whose
  // organization row is missing, so we can't exercise the LEFT JOIN orphan
  // branch here with a real PG instance. The logic is covered by the stub
  // provider in src/data/shared/authz/__tests__/checks-test.ts
  // ("grants access to an orphan generator when the user has an assignment").
  it.skip('returns orgAdminUserId: null when the generator is orphaned', () => {})
})
