import { Alert } from 'react-native'

import { mockDatabase, mockSelectChain, mockSelectChainSequence } from './mock-db'

jest.mock('@/lib/powersync/database', () => mockDatabase())

const { db } = require('@/lib/powersync/database') as ReturnType<
  typeof mockDatabase
>

import {
  ok,
  fail,
  alertOnError,
  isOrgAdmin,
  getGeneratorOrg,
  isGeneratorOrgAdmin,
  canAccessGenerator
} from '../helpers'

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

// ── isOrgAdmin ────────────────────────────────────────────────────────────

describe('isOrgAdmin', () => {
  it('returns true when userId matches adminUserId', async () => {
    mockSelectChain(db, [{ adminUserId: 'user-1' }])
    expect(await isOrgAdmin('user-1', 'org-1')).toBe(true)
  })

  it('returns false when userId does not match', async () => {
    mockSelectChain(db, [{ adminUserId: 'other-user' }])
    expect(await isOrgAdmin('user-1', 'org-1')).toBe(false)
  })

  it('returns false when org not found', async () => {
    mockSelectChain(db, [])
    expect(await isOrgAdmin('user-1', 'org-1')).toBe(false)
  })
})

// ── getGeneratorOrg ───────────────────────────────────────────────────────

describe('getGeneratorOrg', () => {
  it('returns org object when generator found', async () => {
    mockSelectChain(db, [{ organizationId: 'org-1' }])
    expect(await getGeneratorOrg('gen-1')).toEqual({ organizationId: 'org-1' })
  })

  it('returns null when generator not found', async () => {
    mockSelectChain(db, [])
    expect(await getGeneratorOrg('gen-1')).toBeNull()
  })
})

// ── isGeneratorOrgAdmin ───────────────────────────────────────────────────

describe('isGeneratorOrgAdmin', () => {
  it('returns true when generator exists and user is org admin', async () => {
    // 1st select: getGeneratorOrg → generator found
    // 2nd select: isOrgAdmin → admin matches
    mockSelectChainSequence(db, [
      [{ organizationId: 'org-1' }],
      [{ adminUserId: 'user-1' }]
    ])
    expect(await isGeneratorOrgAdmin('user-1', 'gen-1')).toBe(true)
  })

  it('returns false when generator not found', async () => {
    mockSelectChain(db, [])
    expect(await isGeneratorOrgAdmin('user-1', 'gen-1')).toBe(false)
  })

  it('returns false when generator exists but user is not admin', async () => {
    mockSelectChainSequence(db, [
      [{ organizationId: 'org-1' }],
      [{ adminUserId: 'other-user' }]
    ])
    expect(await isGeneratorOrgAdmin('user-1', 'gen-1')).toBe(false)
  })

  it('returns false when generator exists but org not found', async () => {
    mockSelectChainSequence(db, [
      [{ organizationId: 'org-1' }],
      [] // org lookup returns nothing
    ])
    expect(await isGeneratorOrgAdmin('user-1', 'gen-1')).toBe(false)
  })
})

// ── canAccessGenerator ────────────────────────────────────────────────────

describe('canAccessGenerator', () => {
  it('returns false when generator not found', async () => {
    mockSelectChain(db, [])
    expect(await canAccessGenerator('user-1', 'gen-1')).toBe(false)
  })

  it('returns true when user is org admin (skips assignment check)', async () => {
    // 1st: getGeneratorOrg, 2nd: isOrgAdmin → match
    mockSelectChainSequence(db, [
      [{ organizationId: 'org-1' }],
      [{ adminUserId: 'user-1' }]
    ])
    expect(await canAccessGenerator('user-1', 'gen-1')).toBe(true)
  })

  it('returns true when not admin but has assignment', async () => {
    // 1st: getGeneratorOrg, 2nd: isOrgAdmin → no match, 3rd: assignment found
    mockSelectChainSequence(db, [
      [{ organizationId: 'org-1' }],
      [{ adminUserId: 'other-user' }],
      [{ id: 'assign-1' }]
    ])
    expect(await canAccessGenerator('user-1', 'gen-1')).toBe(true)
  })

  it('returns false when not admin and no assignment', async () => {
    // 1st: getGeneratorOrg, 2nd: isOrgAdmin → no match, 3rd: no assignment
    mockSelectChainSequence(db, [
      [{ organizationId: 'org-1' }],
      [{ adminUserId: 'other-user' }],
      []
    ])
    expect(await canAccessGenerator('user-1', 'gen-1')).toBe(false)
  })

  it('returns false when org not found and no assignment', async () => {
    // 1st: getGeneratorOrg, 2nd: isOrgAdmin → org missing (false), 3rd: no assignment
    mockSelectChainSequence(db, [
      [{ organizationId: 'org-1' }],
      [], // org not found → isOrgAdmin returns false
      []  // no assignment either
    ])
    expect(await canAccessGenerator('user-1', 'gen-1')).toBe(false)
  })
})
