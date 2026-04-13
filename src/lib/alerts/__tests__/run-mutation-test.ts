import { Alert } from 'react-native'

import { fail, ok } from '@/data/shared/result'

import { runMutation } from '../run-mutation'

jest.mock('@/lib/haptics', () => ({
  notifySuccess: jest.fn(),
  notifyWarning: jest.fn()
}))

jest.mock('@/lib/i18n/translate-mutation-error', () => ({
  translateMutationError: (error: { code: string }) =>
    `translated:${error.code}`
}))

jest.mock('@/lib/i18n', () => ({ t: (key: string) => key }))

const { notifySuccess, notifyWarning } = jest.requireMock<{
  notifySuccess: jest.Mock
  notifyWarning: jest.Mock
}>('@/lib/haptics')

const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {})

describe('runMutation', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('fires notifySuccess, awaits onSuccess, returns true on success', async () => {
    const onSuccess = jest.fn()
    const result = await runMutation(async () => ok, { onSuccess })

    expect(result).toBe(true)
    expect(notifySuccess).toHaveBeenCalledTimes(1)
    expect(notifyWarning).not.toHaveBeenCalled()
    expect(alertSpy).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('fires notifyWarning when feedback is warning', async () => {
    await runMutation(async () => ok, { feedback: 'warning' })

    expect(notifyWarning).toHaveBeenCalledTimes(1)
    expect(notifySuccess).not.toHaveBeenCalled()
  })

  it('fires no haptic when feedback is none', async () => {
    await runMutation(async () => ok, { feedback: 'none' })

    expect(notifySuccess).not.toHaveBeenCalled()
    expect(notifyWarning).not.toHaveBeenCalled()
  })

  it('alerts with translated message and returns false on failure', async () => {
    const onSuccess = jest.fn()
    const result = await runMutation(async () => fail('GENERATOR_NOT_FOUND'), {
      onSuccess
    })

    expect(result).toBe(false)
    expect(alertSpy).toHaveBeenCalledWith(
      'common.error',
      'translated:GENERATOR_NOT_FOUND'
    )
    expect(notifySuccess).not.toHaveBeenCalled()
    expect(notifyWarning).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it('awaits an async onSuccess before resolving', async () => {
    const events: string[] = []
    const onSuccess = jest.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
      events.push('onSuccess')
    })

    await runMutation(async () => ok, { onSuccess })
    events.push('after')

    expect(events).toEqual(['onSuccess', 'after'])
  })
})
