import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native')
  const Animated = { View }
  class Keyframe {
    duration() {
      return this
    }
  }
  return { __esModule: true, default: Animated, Keyframe }
})

jest.mock('heroui-native', () => {
  const { Pressable, Text, View } = jest.requireActual('react-native')
  function Dialog({
    isOpen,
    children
  }: {
    isOpen: boolean
    onOpenChange?: (open: boolean) => void
    children: React.ReactNode
  }) {
    return isOpen ? <View>{children}</View> : null
  }
  function DialogPortal({ children }: { children: React.ReactNode }) {
    return <View>{children}</View>
  }
  function DialogOverlay({ children }: { children: React.ReactNode }) {
    return <View>{children}</View>
  }
  function DialogContent({ children }: { children: React.ReactNode }) {
    return <View>{children}</View>
  }
  function DialogClose() {
    return null
  }
  function DialogTitle({ children }: { children: React.ReactNode }) {
    return <Text>{children}</Text>
  }
  function DialogDescription({ children }: { children: React.ReactNode }) {
    return <Text>{children}</Text>
  }
  Dialog.Portal = DialogPortal
  Dialog.Overlay = DialogOverlay
  Dialog.Content = DialogContent
  Dialog.Close = DialogClose
  Dialog.Title = DialogTitle
  Dialog.Description = DialogDescription
  function Button({
    children,
    onPress,
    testID
  }: {
    children: React.ReactNode
    onPress?: () => void
    testID?: string
    variant?: string
    size?: string
  }) {
    return (
      <Pressable testID={testID} onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    )
  }
  return { Dialog, Button }
})

jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }))

jest.mock('@/data/client/mutations', () => ({
  acceptInvitation: jest.fn(),
  declineInvitation: jest.fn()
}))

jest.mock('@/lib/alerts', () => ({
  alertOnError: jest.fn(() => false)
}))

jest.mock('@/lib/haptics', () => ({
  notifySuccess: jest.fn(),
  notifyWarning: jest.fn()
}))

jest.mock('@/lib/powersync', () => ({
  useLocalUser: jest.fn()
}))

jest.mock('@/lib/organization/use-user-orgs', () => ({
  useUserOrgs: jest.fn()
}))

import { acceptInvitation, declineInvitation } from '@/data/client/mutations'
import type { InvitationDetails } from '@/lib/hooks/use-pending-invitations'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'
import { useLocalUser } from '@/lib/powersync'

import { InvitationDialog } from '../invitation-dialog'

const acceptInvitationMock = acceptInvitation as jest.Mock
const declineInvitationMock = declineInvitation as jest.Mock
const useLocalUserMock = useLocalUser as jest.Mock
const useUserOrgsMock = useUserOrgs as jest.Mock

const invitationOne: InvitationDetails = {
  id: 'inv-1',
  orgName: 'Acme',
  inviterName: 'Alice'
}

const invitationTwo: InvitationDetails = {
  id: 'inv-2',
  orgName: 'Globex',
  inviterName: 'Bob'
}

beforeEach(() => {
  jest.resetAllMocks()
  useLocalUserMock.mockReturnValue({ id: 'user-1', email: 'me@example.com' })
  useUserOrgsMock.mockReturnValue({ userId: 'user-1' })
  acceptInvitationMock.mockResolvedValue({ ok: true })
  declineInvitationMock.mockResolvedValue({ ok: true })
})

describe('InvitationDialog', () => {
  it('renders title and description from the first invitation', () => {
    const { getByText } = render(
      <InvitationDialog invitations={[invitationOne]} onClose={() => {}} />
    )
    expect(getByText(/Acme/)).toBeTruthy()
    expect(getByText(/Alice/)).toBeTruthy()
  })

  it('calls acceptInvitation with userId, userEmail, invitation id', async () => {
    const onClose = jest.fn()
    const { getByTestId } = render(
      <InvitationDialog invitations={[invitationOne]} onClose={onClose} />
    )
    fireEvent.press(getByTestId('invitation-accept'))
    await waitFor(() => {
      expect(acceptInvitationMock).toHaveBeenCalledWith(
        'user-1',
        'me@example.com',
        'inv-1'
      )
    })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('calls declineInvitation with userEmail and invitation id', async () => {
    const onClose = jest.fn()
    const { getByTestId } = render(
      <InvitationDialog invitations={[invitationOne]} onClose={onClose} />
    )
    fireEvent.press(getByTestId('invitation-decline'))
    await waitFor(() => {
      expect(declineInvitationMock).toHaveBeenCalledWith(
        'me@example.com',
        'inv-1'
      )
    })
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('advances to the next invitation after accept and reads from the prop snapshot', async () => {
    const { getByText, getByTestId, queryByText } = render(
      <InvitationDialog
        invitations={[invitationOne, invitationTwo]}
        onClose={() => {}}
      />
    )
    expect(getByText(/Acme/)).toBeTruthy()
    fireEvent.press(getByTestId('invitation-accept'))
    await waitFor(() => {
      expect(getByText(/Globex/)).toBeTruthy()
      expect(getByText(/Bob/)).toBeTruthy()
      expect(queryByText(/Acme/)).toBeNull()
    })
  })

  it('calls onClose after the last invitation is processed', async () => {
    const onClose = jest.fn()
    const { getByTestId } = render(
      <InvitationDialog
        invitations={[invitationOne, invitationTwo]}
        onClose={onClose}
      />
    )
    fireEvent.press(getByTestId('invitation-accept'))
    await waitFor(() => expect(acceptInvitationMock).toHaveBeenCalledTimes(1))
    fireEvent.press(getByTestId('invitation-accept'))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
