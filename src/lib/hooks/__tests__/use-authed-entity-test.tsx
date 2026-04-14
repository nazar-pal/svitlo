import { renderHook } from '@testing-library/react-native'

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn()
}))

jest.mock('@/lib/powersync', () => ({
  useLocalUser: jest.fn()
}))

jest.mock('@/lib/powersync/database', () => ({
  db: {}
}))

jest.mock('@powersync/react-native', () => ({
  useQuery: jest.fn()
}))

jest.mock('@powersync/drizzle-driver', () => ({
  toCompilableQuery: (q: unknown) => q
}))

const { useLocalSearchParams } = jest.requireMock<{
  useLocalSearchParams: jest.Mock
}>('expo-router')

const { useLocalUser } = jest.requireMock<{
  useLocalUser: jest.Mock
}>('@/lib/powersync')

const { useQuery } = jest.requireMock<{
  useQuery: jest.Mock
}>('@powersync/react-native')

import { useAuthedEntity } from '../use-authed-entity'

interface Row {
  id: string
  name: string
}

function fakeQuery(id: string): {
  execute: () => Promise<Row[]>
  toSQL: () => { sql: string; params: unknown[] }
} {
  return {
    execute: async () => [{ id, name: 'seeded' }],
    toSQL: () => ({ sql: 'select 1', params: [] })
  }
}

beforeEach(() => {
  jest.resetAllMocks()
})

it('returns null when user is unauthenticated', () => {
  useLocalSearchParams.mockReturnValue({ id: 'gen-1' })
  useLocalUser.mockReturnValue(null)
  useQuery.mockReturnValue({ data: [] })
  const load = jest.fn(fakeQuery)

  const { result } = renderHook(() =>
    useAuthedEntity(['id'], params => load(params.id))
  )

  expect(result.current).toBeNull()
  expect(load).not.toHaveBeenCalled()
})

it('returns null when a required param is missing', () => {
  useLocalSearchParams.mockReturnValue({})
  useLocalUser.mockReturnValue({ id: 'user-1' })
  useQuery.mockReturnValue({ data: [] })
  const load = jest.fn(fakeQuery)

  const { result } = renderHook(() =>
    useAuthedEntity(['id'], params => load(params.id))
  )

  expect(result.current).toBeNull()
  expect(load).not.toHaveBeenCalled()
})

it('returns null when the query yields an empty array', () => {
  useLocalSearchParams.mockReturnValue({ id: 'gen-1' })
  useLocalUser.mockReturnValue({ id: 'user-1' })
  useQuery.mockReturnValue({ data: [] })

  const { result } = renderHook(() =>
    useAuthedEntity(['id'], params => fakeQuery(params.id))
  )

  expect(result.current).toBeNull()
})

it('returns { userId, entity } when authed, params present, and row loaded', () => {
  useLocalSearchParams.mockReturnValue({ id: 'gen-1' })
  useLocalUser.mockReturnValue({ id: 'user-1' })
  useQuery.mockReturnValue({
    data: [{ id: 'gen-1', name: 'seeded' }]
  })

  const { result } = renderHook(() =>
    useAuthedEntity(['id'], params => fakeQuery(params.id))
  )

  expect(result.current).toEqual({
    userId: 'user-1',
    entity: { id: 'gen-1', name: 'seeded' }
  })
})

it('passes the resolved compilable query to useQuery when guards pass', () => {
  useLocalSearchParams.mockReturnValue({ id: 'gen-1' })
  useLocalUser.mockReturnValue({ id: 'user-1' })
  useQuery.mockReturnValue({ data: [{ id: 'gen-1', name: 'seeded' }] })
  const load = jest.fn(fakeQuery)

  renderHook(() => useAuthedEntity(['id'], params => load(params.id)))

  expect(load).toHaveBeenCalledWith('gen-1')
  const [compiled] = useQuery.mock.calls[0]
  expect(compiled).not.toBe('SELECT 0 WHERE 0')
})

it('passes the no-op query to useQuery when guards fail', () => {
  useLocalSearchParams.mockReturnValue({})
  useLocalUser.mockReturnValue({ id: 'user-1' })
  useQuery.mockReturnValue({ data: [] })

  renderHook(() => useAuthedEntity(['id'], params => fakeQuery(params.id)))

  const [compiled] = useQuery.mock.calls[0]
  expect(compiled).toBe('SELECT 0 WHERE 0')
})
