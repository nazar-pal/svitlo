import type Database from 'better-sqlite3'
import type { drizzle } from 'drizzle-orm/better-sqlite3'
import { renderHook, waitFor } from '@testing-library/react-native'

import { IDS, seedBaseScenario } from '@/data/client/mutations/__tests__/seed'
import {
  closeDatabase,
  createTestDatabase,
  resetDatabase
} from '@/data/client/mutations/__tests__/test-db'

let mockDb: ReturnType<typeof drizzle>
let mockSqlite: Database.Database

jest.mock('@powersync/react-native', () =>
  require('@/lib/hooks/__tests__/mock-use-query').createUseQueryMock()
)

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockDb
  }
}))

jest.mock('@/lib/powersync', () => ({}))

const { useOrgAuthzFacts } = require('../policy-hooks')

beforeAll(async () => {
  const testDb = await createTestDatabase()
  mockDb = testDb.db
  mockSqlite = testDb.sqlite
})

beforeEach(() => {
  jest.resetAllMocks()
  resetDatabase(mockSqlite)
})

afterAll(() => {
  closeDatabase(mockSqlite)
})

// ── useOrgAuthzFacts ────────────────────────────────────────────────────────

describe('useOrgAuthzFacts', () => {
  it('reports loading when inputs are missing', () => {
    const { result } = renderHook(() => useOrgAuthzFacts(null, null))
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('resolves with org: null when the organization does not exist', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useOrgAuthzFacts(IDS.adminUser, 'does-not-exist')
    )

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        org: null,
        isCallerOrgAdmin: false
      })
    })
  })

  it('returns isCallerOrgAdmin: true for the org admin', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useOrgAuthzFacts(IDS.adminUser, IDS.org)
    )

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        org: { id: IDS.org, adminUserId: IDS.adminUser },
        isCallerOrgAdmin: true
      })
    })
  })

  it('returns isCallerOrgAdmin: false for a non-admin member', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useOrgAuthzFacts(IDS.memberUser, IDS.org)
    )

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        org: { id: IDS.org, adminUserId: IDS.adminUser },
        isCallerOrgAdmin: false
      })
    })
  })
})
