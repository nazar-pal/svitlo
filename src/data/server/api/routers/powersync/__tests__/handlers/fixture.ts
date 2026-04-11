import type { WriteContext } from '../../handlers'

import { IDS, seedBaseScenario } from '../seed-server'
import {
  closeServerDatabase,
  createTestServerDatabase,
  resetServerDatabase
} from '../test-server-db'

type TestDb = Awaited<ReturnType<typeof createTestServerDatabase>>

/**
 * Registers Jest lifecycle hooks for a PGlite-backed server handler test
 * file. Each test file gets its own PGlite instance — Jest parallelises
 * files, so isolation matters. The returned handle exposes `testDb` and
 * `makeCtx` lazily; both throw when touched before `beforeAll` has run.
 */
export function setupServerHandlersFixture() {
  const state: { testDb: TestDb | null } = { testDb: null }

  beforeAll(async () => {
    state.testDb = await createTestServerDatabase()
  })

  beforeEach(async () => {
    await resetServerDatabase()
    await seedBaseScenario(state.testDb!.db)
  })

  afterAll(async () => {
    await closeServerDatabase()
  })

  const assertReady = (): TestDb => {
    if (!state.testDb) throw new Error('testDb accessed before beforeAll')
    return state.testDb
  }

  return {
    get testDb(): TestDb {
      return assertReady()
    },
    makeCtx(overrides: Partial<WriteContext> = {}): WriteContext {
      return {
        db: assertReady().db as unknown as WriteContext['db'],
        userId: IDS.admin,
        userEmail: 'admin@test.com',
        op: 'insert',
        id: crypto.randomUUID(),
        data: {},
        now: () => new Date(),
        ...overrides
      }
    }
  }
}
