import { generators } from '@/data/server/db-schema/generators'

import {
  IDS,
  seedBaseScenario
} from '../../api/routers/powersync/__tests__/seed-server'
import {
  closeServerDatabase,
  createTestServerDatabase,
  resetServerDatabase
} from '../../api/routers/powersync/__tests__/test-server-db'

// These tests assert the Postgres CHECK constraints on the `generators` table
// directly, bypassing `handleGenerators` and its Zod whitelist. They guard the
// defense-in-depth layer: even if a future code path inserts a generator
// without going through the handler, the DB refuses invalid rows.

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

function insertGenerator(
  overrides: Partial<typeof generators.$inferInsert> = {}
) {
  return testDb.db.insert(generators).values({
    organizationId: IDS.org,
    title: 'Gen',
    model: 'Honda',
    maxConsecutiveRunHours: 8,
    requiredRestHours: 4,
    runWarningThresholdPct: 80,
    ...overrides
  })
}

describe('generators CHECK constraints', () => {
  it('rejects empty title', async () => {
    await expect(insertGenerator({ title: '   ' })).rejects.toThrow()
  })

  it('rejects non-positive max_consecutive_run_hours', async () => {
    await expect(
      insertGenerator({ maxConsecutiveRunHours: 0 })
    ).rejects.toThrow()
  })

  it('rejects non-positive required_rest_hours', async () => {
    await expect(insertGenerator({ requiredRestHours: 0 })).rejects.toThrow()
  })

  it('rejects warning threshold of 0', async () => {
    await expect(
      insertGenerator({ runWarningThresholdPct: 0 })
    ).rejects.toThrow()
  })

  it('rejects warning threshold above 100', async () => {
    await expect(
      insertGenerator({ runWarningThresholdPct: 101 })
    ).rejects.toThrow()
  })
})
