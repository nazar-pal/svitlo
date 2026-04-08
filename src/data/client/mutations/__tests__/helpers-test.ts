import { Alert } from 'react-native'

jest.mock('@/lib/powersync/database', () => ({ db: {} }))

import { ok, fail, alertOnError } from '../helpers'

beforeEach(() => {
  jest.resetAllMocks()
})

// ── ok / fail ─────────────────────────────────────────────────────────────

describe('ok / fail', () => {
  it('ok has ok: true', () => {
    expect(ok).toEqual({ ok: true })
  })

  it('fail returns ok: false with the error string', () => {
    expect(fail('something broke')).toEqual({
      ok: false,
      error: 'something broke'
    })
  })

  it('fail result has error field', () => {
    expect(fail('x')).toHaveProperty('error')
  })
})

// ── alertOnError ──────────────────────────────────────────────────────────

describe('alertOnError', () => {
  let alertSpy: jest.SpyInstance

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation()
  })

  it('returns false for ok result', () => {
    expect(alertOnError({ ok: true })).toBe(false)
  })

  it('returns true for failure result', () => {
    expect(alertOnError({ ok: false, error: 'e' })).toBe(true)
  })

  it('calls Alert.alert on failure', () => {
    alertOnError(fail('e'))
    expect(alertSpy).toHaveBeenCalledTimes(1)
  })

  it('does not call Alert.alert on success', () => {
    alertOnError(ok)
    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('passes two string arguments to Alert.alert', () => {
    alertOnError(fail('e'))
    expect(alertSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String)
    )
  })
})
