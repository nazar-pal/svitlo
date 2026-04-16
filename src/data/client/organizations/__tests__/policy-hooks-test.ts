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

const { policies, usePolicy } = require('@/data/client/use-policy')

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

describe('usePolicy(organizations.renameOrganization)', () => {
  it('reports loading when args are null', () => {
    const { result } = renderHook(() =>
      usePolicy(policies.organizations.renameOrganization, null)
    )
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with ORGANIZATION_NOT_FOUND when the org does not exist', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.organizations.renameOrganization, {
        callerUserId: IDS.adminUser,
        organizationId: 'does-not-exist'
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'ORGANIZATION_NOT_FOUND'
      })
    })
  })

  it('rejects with ONLY_ADMIN_CAN_RENAME_ORG for a non-admin caller', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.organizations.renameOrganization, {
        callerUserId: IDS.memberUser,
        organizationId: IDS.org
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'ONLY_ADMIN_CAN_RENAME_ORG'
      })
    })
  })

  it('accepts the happy path for the admin', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.organizations.renameOrganization, {
        callerUserId: IDS.adminUser,
        organizationId: IDS.org
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})
