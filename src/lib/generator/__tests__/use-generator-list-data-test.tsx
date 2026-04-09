import type Database from 'better-sqlite3'
import type { drizzle } from 'drizzle-orm/better-sqlite3'
import { renderHook, waitFor } from '@testing-library/react-native'

import {
  createTestDatabase,
  resetDatabase,
  closeDatabase
} from '@/data/client/mutations/__tests__/test-db'
import {
  IDS,
  seedBaseScenario,
  seedGenerator
} from '@/data/client/mutations/__tests__/seed'
import { generators } from '@/data/client/db-schema/generators'

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

jest.mock('@/lib/powersync', () => ({
  differential: () => ({})
}))

jest.mock('@/lib/organization/use-selected-org', () => ({
  useSelectedOrg: jest.fn()
}))

const { useSelectedOrg } = jest.requireMock<{
  useSelectedOrg: jest.Mock
}>('@/lib/organization/use-selected-org')

const { useGeneratorListData } = require('../use-generator-list-data')

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

function setupMocks(orgId: string | null = IDS.org) {
  useSelectedOrg.mockReturnValue({
    selectedOrgId: orgId,
    setSelectedOrgId: jest.fn()
  })
}

// Smoke tests only — grouping + next-maintenance semantics are covered by
// the pure unit test in generator-list-model-test.ts.
describe('useGeneratorListData', () => {
  it('returns empty generators when no org selected', async () => {
    setupMocks(null)

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      expect(result.current.generators).toEqual([])
    })
  })

  it('returns generators for the selected org and excludes others', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    mockDb
      .insert(generators)
      .values({
        id: 'gen-other',
        organizationId: 'other-org',
        title: 'Other Gen',
        model: 'X',
        maxConsecutiveRunHours: 8,
        requiredRestHours: 4,
        runWarningThresholdPct: 80,
        createdAt: '2026-01-15T12:00:00Z'
      })
      .run()
    setupMocks()

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      expect(result.current.generators).toHaveLength(1)
      expect(result.current.generators[0].id).toBe(IDS.generator)
    })
  })
})
