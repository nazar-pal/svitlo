import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

jest.mock('heroui-native', () => {
  const { Pressable, Text } = jest.requireActual('react-native')
  function Button({
    children,
    onPress
  }: {
    children: React.ReactNode
    onPress?: () => void
    variant?: string
  }) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    )
  }
  return { Button }
})

jest.mock('@/lib/auth/local-identity-context', () => ({
  useLocalIdentity: jest.fn()
}))

jest.mock('@/lib/auth/sign-out', () => ({
  disconnectAndSignOut: jest.fn()
}))

import { useLocalIdentity } from '@/lib/auth/local-identity-context'
import { disconnectAndSignOut } from '@/lib/auth/sign-out'

import { ReadinessErrorScreen } from '../error-screen'

const useLocalIdentityMock = useLocalIdentity as jest.Mock
const disconnectAndSignOutMock = disconnectAndSignOut as jest.Mock

let applyIdentity: jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  applyIdentity = jest.fn()
  useLocalIdentityMock.mockReturnValue({
    identity: null,
    isLoading: false,
    applyIdentity
  })
  disconnectAndSignOutMock.mockResolvedValue(undefined)
})

describe('ReadinessErrorScreen', () => {
  it('renders the provided message', () => {
    const { getByText } = render(
      <ReadinessErrorScreen message="Disk is corrupted" onRetry={() => {}} />
    )
    expect(getByText('Disk is corrupted')).toBeTruthy()
    expect(getByText('Something went wrong')).toBeTruthy()
  })

  it('falls back to a generic message when message is undefined', () => {
    const { getByText } = render(
      <ReadinessErrorScreen message={undefined} onRetry={() => {}} />
    )
    expect(getByText('Unable to open your local database.')).toBeTruthy()
  })

  it('Try Again calls onRetry', () => {
    const onRetry = jest.fn()
    const { getByText } = render(
      <ReadinessErrorScreen message="boom" onRetry={onRetry} />
    )
    fireEvent.press(getByText('Try Again'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('Emergency Sign Out calls disconnectAndSignOut then applyIdentity(null)', async () => {
    const { getByText } = render(
      <ReadinessErrorScreen message="boom" onRetry={() => {}} />
    )
    fireEvent.press(getByText('Emergency Sign Out'))

    await waitFor(() =>
      expect(disconnectAndSignOutMock).toHaveBeenCalledTimes(1)
    )
    await waitFor(() => expect(applyIdentity).toHaveBeenCalledWith(null))
  })
})
