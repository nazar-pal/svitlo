import type { drizzle } from 'drizzle-orm/better-sqlite3'
import { renderHook, waitFor } from '@testing-library/react-native'

import {
  createTestDatabase,
  resetDatabase,
  closeDatabase
} from '@/data/client/mutations/__tests__/test-db'
import {
  seedBaseScenario,
  seedInvitation
} from '@/data/client/mutations/__tests__/seed'

let mockDb: unknown
let mockDrizzleDb: ReturnType<typeof drizzle>

jest.mock('@powersync/react-native', () => ({
  useQuery: (query: unknown) => {
    const React = require('react')
    const { act } = require('@testing-library/react-native')
    const [data, setData] = React.useState([])

    React.useEffect(() => {
      if (typeof query === 'string') {
        setData([])
        return
      }
      const q = query as { execute: () => Promise<unknown[]> }
      let active = true
      q.execute().then((rows: unknown[]) => {
        act(() => {
          if (active) setData(rows)
        })
      })
      return () => {
        active = false
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps -- mock runs once per renderHook; real useQuery uses SQL string comparison internally
    }, [])

    return { data, isLoading: false, error: undefined, isFetching: false }
  }
}))

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockDb
  }
}))

jest.mock('@/lib/powersync', () => ({
  useLocalUser: jest.fn()
}))

const { useLocalUser } = jest.requireMock<{
  useLocalUser: jest.Mock
}>('@/lib/powersync')

const { usePendingInvitations } = require('../use-pending-invitations')

beforeAll(async () => {
  const testDb = await createTestDatabase()
  mockDb = testDb.db
  mockDrizzleDb = testDb.db
})

beforeEach(() => {
  jest.resetAllMocks()
  resetDatabase()
})

afterAll(() => {
  closeDatabase()
})

it('returns [] when user has no invitations', async () => {
  useLocalUser.mockReturnValue({ email: 'nobody@test.com' })

  const { result } = renderHook(() => usePendingInvitations())

  await waitFor(() => {
    expect(result.current).toEqual([])
  })
})

it('returns matching invitations for user email', async () => {
  seedBaseScenario(mockDrizzleDb)
  seedInvitation(mockDrizzleDb, 'user@test.com')

  useLocalUser.mockReturnValue({ email: 'user@test.com' })

  const { result } = renderHook(() => usePendingInvitations())

  await waitFor(() => {
    expect(result.current).toHaveLength(1)
    expect(result.current[0].inviteeEmail).toBe('user@test.com')
  })
})

it('matches email case-insensitively via normalization', async () => {
  seedBaseScenario(mockDrizzleDb)
  seedInvitation(mockDrizzleDb, 'user@test.com')

  useLocalUser.mockReturnValue({ email: 'User@Test.COM' })

  const { result } = renderHook(() => usePendingInvitations())

  await waitFor(() => {
    expect(result.current).toHaveLength(1)
  })
})

it('ignores invitations for other emails', async () => {
  seedBaseScenario(mockDrizzleDb)
  seedInvitation(mockDrizzleDb, 'other@test.com')

  useLocalUser.mockReturnValue({ email: 'mine@test.com' })

  const { result } = renderHook(() => usePendingInvitations())

  await waitFor(() => {
    expect(result.current).toEqual([])
  })
})

it('returns [] when user is not loaded', async () => {
  useLocalUser.mockReturnValue(null)

  const { result } = renderHook(() => usePendingInvitations())

  await waitFor(() => {
    expect(result.current).toEqual([])
  })
})
