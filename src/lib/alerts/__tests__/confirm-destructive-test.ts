import { Alert, type AlertButton } from 'react-native'

import { confirmDestructive } from '../confirm-destructive'

jest.mock('../run-mutation', () => ({ runMutation: jest.fn() }))
jest.mock('@/lib/haptics', () => ({ notifyWarning: jest.fn() }))
jest.mock('@/lib/i18n', () => ({ t: (key: string) => key }))

const { runMutation } = jest.requireMock<{ runMutation: jest.Mock }>(
  '../run-mutation'
)
const { notifyWarning } = jest.requireMock<{ notifyWarning: jest.Mock }>(
  '@/lib/haptics'
)

const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})

function lastButtons(): AlertButton[] {
  return alertSpy.mock.calls.at(-1)![2]!
}

describe('confirmDestructive', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    // resetAllMocks wipes the spy's implementation too — re-install the
    // no-op so no test ever triggers a real native alert.
    alertSpy.mockImplementation(() => {})
  })

  it('presents cancel + destructive buttons with the default delete label', () => {
    confirmDestructive('Delete?', 'This cannot be undone')

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete?',
      'This cannot be undone',
      expect.any(Array)
    )
    const [cancel, destructive] = lastButtons()
    expect(cancel).toMatchObject({ text: 'common.cancel', style: 'cancel' })
    expect(destructive).toMatchObject({
      text: 'common.delete',
      style: 'destructive'
    })
  })

  it('uses a custom confirm label', () => {
    confirmDestructive('Remove?', 'Are you sure', {
      confirmLabel: 'common.remove'
    })

    expect(lastButtons()[1]).toMatchObject({ text: 'common.remove' })
  })

  it('runs a mutation through runMutation with warning feedback + onSuccess', () => {
    const mutation = jest.fn()
    const onSuccess = jest.fn()
    confirmDestructive('Delete?', 'msg', { mutation, onSuccess })

    lastButtons()[1].onPress!()

    expect(runMutation).toHaveBeenCalledTimes(1)
    expect(runMutation).toHaveBeenCalledWith(mutation, {
      feedback: 'warning',
      onSuccess
    })
    expect(notifyWarning).not.toHaveBeenCalled()
  })

  it('fires the warning haptic and onConfirm when there is no mutation', () => {
    const onConfirm = jest.fn()
    confirmDestructive('Sign out?', 'msg', { onConfirm })

    lastButtons()[1].onPress!()

    expect(notifyWarning).toHaveBeenCalledTimes(1)
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(runMutation).not.toHaveBeenCalled()
  })

  it('invokes onCancel from the cancel button', () => {
    const onCancel = jest.fn()
    confirmDestructive('Sign out?', 'msg', { onCancel })

    lastButtons()[0].onPress!()

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(runMutation).not.toHaveBeenCalled()
  })
})
