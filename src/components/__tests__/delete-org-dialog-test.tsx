import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'

jest.mock('react-native-keyboard-controller', () => {
  const { View } = jest.requireActual('react-native')
  return {
    KeyboardAvoidingView: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    )
  }
})

jest.mock('heroui-native', () => {
  const { Pressable, Text, TextInput, View } =
    jest.requireActual('react-native')
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
    isDisabled
  }: {
    children: React.ReactNode
    onPress?: () => void
    isDisabled?: boolean
  }) {
    return (
      <Pressable
        disabled={isDisabled}
        onPress={() => !isDisabled && onPress?.()}
      >
        <Text>{children}</Text>
      </Pressable>
    )
  }
  function TextField({ children }: { children: React.ReactNode }) {
    return <View>{children}</View>
  }
  function Label({ children }: { children: React.ReactNode }) {
    return <Text>{children}</Text>
  }
  function FieldError({ children }: { children: React.ReactNode }) {
    return <Text>{children}</Text>
  }
  function Input({
    value,
    onChangeText,
    placeholder
  }: {
    value: string
    onChangeText: (text: string) => void
    placeholder?: string
  }) {
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
      />
    )
  }
  return {
    Dialog,
    Button,
    TextField,
    Label,
    FieldError,
    Input,
    useToast: () => ({ toast: { show: jest.fn() } })
  }
})

jest.mock('expo-blur', () => ({ BlurView: 'BlurView' }))

jest.mock('@/data/client/mutations', () => ({
  deleteOrganization: jest.fn()
}))

jest.mock('@/data/client/queries', () => ({
  getOrganization: jest.fn()
}))

jest.mock('@/lib/alerts', () => ({
  runMutation: jest.fn()
}))

jest.mock('@/lib/hooks/use-drizzle-query', () => ({
  useDrizzleQuery: jest.fn()
}))

jest.mock('@/lib/powersync', () => ({
  useLocalUserId: jest.fn()
}))

import { deleteOrganization } from '@/data/client/mutations'
import { runMutation } from '@/lib/alerts'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUserId } from '@/lib/powersync'

import { DeleteOrgDialog } from '../delete-org-dialog'

const deleteOrganizationMock = deleteOrganization as jest.Mock
const runMutationMock = runMutation as jest.Mock
const useDrizzleQueryMock = useDrizzleQuery as jest.Mock
const useLocalUserIdMock = useLocalUserId as jest.Mock

const ORG_NAME = 'Acme'

beforeEach(() => {
  jest.resetAllMocks()
  useLocalUserIdMock.mockReturnValue('user-1')
  useDrizzleQueryMock.mockReturnValue({ data: [{ name: ORG_NAME }] })
  deleteOrganizationMock.mockResolvedValue({ ok: true })
  runMutationMock.mockImplementation(async (mutation, options) => {
    const result = await mutation()
    if (!result.ok) return false
    await options?.onSuccess?.()
    return true
  })
})

describe('DeleteOrgDialog', () => {
  it('does not delete until the typed text matches the org name', () => {
    const { getByPlaceholderText, getByText } = render(
      <DeleteOrgDialog orgId="org-1" onClose={() => {}} />
    )
    fireEvent.changeText(getByPlaceholderText(ORG_NAME), 'wrong')
    fireEvent.press(getByText('Delete'))
    expect(runMutationMock).not.toHaveBeenCalled()
    expect(deleteOrganizationMock).not.toHaveBeenCalled()
  })

  it('deletes with userId and orgId when the name matches, then notifies and closes', async () => {
    const onClose = jest.fn()
    const onDeleted = jest.fn()
    const { getByPlaceholderText, getByText } = render(
      <DeleteOrgDialog orgId="org-1" onClose={onClose} onDeleted={onDeleted} />
    )
    fireEvent.changeText(getByPlaceholderText(ORG_NAME), ORG_NAME)
    fireEvent.press(getByText('Delete'))
    await waitFor(() =>
      expect(deleteOrganizationMock).toHaveBeenCalledWith('user-1', 'org-1')
    )
    await waitFor(() => expect(onDeleted).toHaveBeenCalled())
    await waitFor(() => expect(onClose).toHaveBeenCalled())
  })

  it('guards against a double submit while a delete is in flight', async () => {
    runMutationMock.mockImplementation(mutation => {
      mutation()
      return new Promise(() => {})
    })
    const { getByPlaceholderText, getByText } = render(
      <DeleteOrgDialog orgId="org-1" onClose={() => {}} />
    )
    fireEvent.changeText(getByPlaceholderText(ORG_NAME), ORG_NAME)
    const deleteButton = getByText('Delete')
    fireEvent.press(deleteButton)
    fireEvent.press(deleteButton)
    await waitFor(() => expect(runMutationMock).toHaveBeenCalledTimes(1))
    expect(deleteOrganizationMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the dialog open when the delete fails', async () => {
    runMutationMock.mockResolvedValue(false)
    const onClose = jest.fn()
    const { getByPlaceholderText, getByText } = render(
      <DeleteOrgDialog orgId="org-1" onClose={onClose} />
    )
    fireEvent.changeText(getByPlaceholderText(ORG_NAME), ORG_NAME)
    fireEvent.press(getByText('Delete'))
    await waitFor(() => expect(runMutationMock).toHaveBeenCalledTimes(1))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('resets the typed text when cancelled', () => {
    const onClose = jest.fn()
    const { getByPlaceholderText, getByText } = render(
      <DeleteOrgDialog orgId="org-1" onClose={onClose} />
    )
    const input = getByPlaceholderText(ORG_NAME)
    fireEvent.changeText(input, ORG_NAME)
    expect(input.props.value).toBe(ORG_NAME)
    fireEvent.press(getByText('Cancel'))
    expect(onClose).toHaveBeenCalled()
    expect(getByPlaceholderText(ORG_NAME).props.value).toBe('')
  })
})
