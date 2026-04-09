import type Database from 'better-sqlite3'
import type { drizzle } from 'drizzle-orm/better-sqlite3'
import { renderHook, waitFor } from '@testing-library/react-native'

import {
  createTestDatabase,
  resetDatabase,
  closeDatabase
} from '@/data/client/mutations/__tests__/test-db'
import { IDS, seedBaseScenario } from '@/data/client/mutations/__tests__/seed'
import { organizations } from '@/data/client/db-schema/organizations'

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

jest.mock('@/lib/powersync/use-local-user', () => ({
  useLocalUser: jest.fn()
}))

const { useLocalUser } = jest.requireMock<{
  useLocalUser: jest.Mock
}>('@/lib/powersync/use-local-user')

const { useUserOrgs } = require('../use-user-orgs')

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

describe('useUserOrgs', () => {
  it('returns empty userOrgs when user is not loaded', async () => {
    useLocalUser.mockReturnValue(null)

    const { result } = renderHook(() => useUserOrgs())

    await waitFor(() => {
      expect(result.current.userOrgs).toEqual([])
      expect(result.current.userId).toBe('')
    })
  })

  it('returns org for admin user', async () => {
    seedBaseScenario(mockDb)
    useLocalUser.mockReturnValue({ id: IDS.adminUser })

    const { result } = renderHook(() => useUserOrgs())

    await waitFor(() => {
      expect(result.current.userOrgs).toHaveLength(1)
      expect(result.current.userOrgs[0].id).toBe(IDS.org)
    })
  })

  it('returns org for member user', async () => {
    seedBaseScenario(mockDb)
    useLocalUser.mockReturnValue({ id: IDS.memberUser })

    const { result } = renderHook(() => useUserOrgs())

    await waitFor(() => {
      expect(result.current.userOrgs).toHaveLength(1)
      expect(result.current.userOrgs[0].id).toBe(IDS.org)
    })
  })

  it('returns empty userOrgs for outsider', async () => {
    seedBaseScenario(mockDb)
    useLocalUser.mockReturnValue({ id: IDS.outsiderUser })

    const { result } = renderHook(() => useUserOrgs())

    await waitFor(() => {
      expect(result.current.userOrgs).toEqual([])
    })
  })

  it('allOrgs contains all organizations regardless of membership', async () => {
    seedBaseScenario(mockDb)
    mockDb
      .insert(organizations)
      .values({
        id: 'org-2',
        name: 'Other Org',
        adminUserId: 'some-other-user',
        createdAt: '2026-01-15T12:00:00Z'
      })
      .run()

    useLocalUser.mockReturnValue({ id: IDS.outsiderUser })

    const { result } = renderHook(() => useUserOrgs())

    await waitFor(() => {
      expect(result.current.allOrgs).toHaveLength(2)
      expect(result.current.userOrgs).toEqual([])
    })
  })

  it('isAdmin returns true for admin of the org', async () => {
    seedBaseScenario(mockDb)
    useLocalUser.mockReturnValue({ id: IDS.adminUser })

    const { result } = renderHook(() => useUserOrgs())

    await waitFor(() => {
      expect(result.current.isAdmin(IDS.org)).toBe(true)
    })
  })

  it('isAdmin returns false for member of the org', async () => {
    seedBaseScenario(mockDb)
    useLocalUser.mockReturnValue({ id: IDS.memberUser })

    const { result } = renderHook(() => useUserOrgs())

    await waitFor(() => {
      expect(result.current.isAdmin(IDS.org)).toBe(false)
    })
  })

  it('isAdmin returns false for null orgId', async () => {
    seedBaseScenario(mockDb)
    useLocalUser.mockReturnValue({ id: IDS.adminUser })

    const { result } = renderHook(() => useUserOrgs())

    await waitFor(() => {
      expect(result.current.isAdmin(null)).toBe(false)
    })
  })
})
