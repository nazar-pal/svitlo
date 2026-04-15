import type Database from 'better-sqlite3'
import { renderHook, waitFor } from '@testing-library/react-native'
import { eq } from 'drizzle-orm'

import {
  IDS,
  seedBaseScenario,
  seedGenerator
} from '@/data/client/mutations/__tests__/seed'
import {
  closeDatabase,
  createTestDatabase,
  resetDatabase
} from '@/data/client/mutations/__tests__/test-db'
import { generators } from '@/data/client/db-schema/generators'

type TestDb = Awaited<ReturnType<typeof createTestDatabase>>['db']

let mockDb: TestDb
let mockSqlite: Database.Database

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn()
}))

jest.mock('@/lib/powersync', () => ({
  useLocalUser: jest.fn()
}))

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockDb
  }
}))

jest.mock('@powersync/react-native', () =>
  require('@/lib/hooks/__tests__/mock-use-query').createUseQueryMock()
)

const { useLocalSearchParams } = jest.requireMock<{
  useLocalSearchParams: jest.Mock
}>('expo-router')

const { useLocalUser } = jest.requireMock<{
  useLocalUser: jest.Mock
}>('@/lib/powersync')

import { useAuthedEntity } from '../use-authed-entity'

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

it('returns null when user is unauthenticated', async () => {
  useLocalSearchParams.mockReturnValue({ id: IDS.generator })
  useLocalUser.mockReturnValue(null)

  const { result } = renderHook(() =>
    useAuthedEntity(['id'], params =>
      mockDb.query.generators.findFirst({ where: eq(generators.id, params.id) })
    )
  )

  await waitFor(() => {
    expect(result.current).toBeNull()
  })
})

it('returns null when a required param is missing', async () => {
  useLocalSearchParams.mockReturnValue({})
  useLocalUser.mockReturnValue({ id: IDS.adminUser })

  const { result } = renderHook(() =>
    useAuthedEntity(['id'], params =>
      mockDb.query.generators.findFirst({ where: eq(generators.id, params.id) })
    )
  )

  await waitFor(() => {
    expect(result.current).toBeNull()
  })
})

it('returns null when the query yields no row', async () => {
  seedBaseScenario(mockDb)
  useLocalSearchParams.mockReturnValue({ id: 'does-not-exist' })
  useLocalUser.mockReturnValue({ id: IDS.adminUser })

  const { result } = renderHook(() =>
    useAuthedEntity(['id'], params =>
      mockDb.query.generators.findFirst({ where: eq(generators.id, params.id) })
    )
  )

  await waitFor(() => {
    expect(result.current).toBeNull()
  })
})

it('returns { userId, entity } when authed, params present, and row loaded', async () => {
  seedBaseScenario(mockDb)
  seedGenerator(mockDb)
  useLocalSearchParams.mockReturnValue({ id: IDS.generator })
  useLocalUser.mockReturnValue({ id: IDS.adminUser })

  const { result } = renderHook(() =>
    useAuthedEntity(['id'], params =>
      mockDb.query.generators.findFirst({ where: eq(generators.id, params.id) })
    )
  )

  await waitFor(() => {
    expect(result.current?.userId).toBe(IDS.adminUser)
    expect(result.current?.entity?.id).toBe(IDS.generator)
  })
})
