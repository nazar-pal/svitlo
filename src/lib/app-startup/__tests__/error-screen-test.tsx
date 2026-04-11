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

jest.mock('@/lib/auth/session', () => ({
  useAuthSession: jest.fn()
}))

import { useAuthSession } from '@/lib/auth/session'

import { StartupErrorScreen } from '../error-screen'

const useAuthSessionMock = useAuthSession as jest.Mock

let emergencySignOut: jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  emergencySignOut = jest.fn(async () => {})
  useAuthSessionMock.mockReturnValue({
    phase: 'anonymous',
    identity: null,
    session: null,
    status: 'unknown',
    markExpired: jest.fn(),
    signOut: jest.fn(),
    emergencySignOut
  })
})

describe('StartupErrorScreen', () => {
  it('renders the provided message', () => {
    const { getByText } = render(
      <StartupErrorScreen message="Disk is corrupted" onRetry={() => {}} />
    )
    expect(getByText('Disk is corrupted')).toBeTruthy()
    expect(getByText('Something went wrong')).toBeTruthy()
  })

  it('falls back to a generic message when message is undefined', () => {
    const { getByText } = render(
      <StartupErrorScreen message={undefined} onRetry={() => {}} />
    )
    expect(getByText('Unable to open your local database.')).toBeTruthy()
  })

  it('Try Again calls onRetry', () => {
    const onRetry = jest.fn()
    const { getByText } = render(
      <StartupErrorScreen message="boom" onRetry={onRetry} />
    )
    fireEvent.press(getByText('Try Again'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('Emergency Sign Out calls emergencySignOut()', async () => {
    const { getByText } = render(
      <StartupErrorScreen message="boom" onRetry={() => {}} />
    )
    fireEvent.press(getByText('Emergency Sign Out'))

    await waitFor(() => expect(emergencySignOut).toHaveBeenCalledTimes(1))
  })
})
