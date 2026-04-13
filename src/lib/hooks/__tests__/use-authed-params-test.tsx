import { renderHook } from '@testing-library/react-native'

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn()
}))

jest.mock('@/lib/powersync', () => ({
  useLocalUser: jest.fn()
}))

const { useLocalSearchParams } = jest.requireMock<{
  useLocalSearchParams: jest.Mock
}>('expo-router')

const { useLocalUser } = jest.requireMock<{
  useLocalUser: jest.Mock
}>('@/lib/powersync')

import { useAuthedParams } from '../use-authed-params'

beforeEach(() => {
  jest.resetAllMocks()
})

it('returns null when there is no local user', () => {
  useLocalSearchParams.mockReturnValue({ id: 'gen-1' })
  useLocalUser.mockReturnValue(null)

  const { result } = renderHook(() => useAuthedParams(['id']))

  expect(result.current).toBeNull()
})

it('returns null when a declared param is empty', () => {
  useLocalSearchParams.mockReturnValue({ id: '' })
  useLocalUser.mockReturnValue({ id: 'user-1' })

  const { result } = renderHook(() => useAuthedParams(['id']))

  expect(result.current).toBeNull()
})

it('returns null when a declared param is missing from the URL', () => {
  useLocalSearchParams.mockReturnValue({})
  useLocalUser.mockReturnValue({ id: 'user-1' })

  const { result } = renderHook(() => useAuthedParams(['id']))

  expect(result.current).toBeNull()
})

it('returns null when any of multiple params is empty', () => {
  useLocalSearchParams.mockReturnValue({ id: 'gen-1', templateId: '' })
  useLocalUser.mockReturnValue({ id: 'user-1' })

  const { result } = renderHook(() => useAuthedParams(['id', 'templateId']))

  expect(result.current).toBeNull()
})

it('returns userId and params on happy path', () => {
  useLocalSearchParams.mockReturnValue({ id: 'gen-1' })
  useLocalUser.mockReturnValue({ id: 'user-1' })

  const { result } = renderHook(() => useAuthedParams(['id']))

  expect(result.current).toEqual({
    userId: 'user-1',
    params: { id: 'gen-1' }
  })
})
