import type { LocalIdentity } from '../../offline-identity'
import type { BetterAuthSession } from '../../session-runtime'
import { derivePhase, initialInternalState, reduce } from '../reducer'
import type { InternalState } from '../types'

const identity = (userId: string): LocalIdentity => ({ version: 1, userId })

const sessionNamed = (name: string): BetterAuthSession =>
  ({ user: { id: 'user-1', name } }) as unknown as BetterAuthSession

function state(overrides: Partial<InternalState> = {}): InternalState {
  return { ...initialInternalState, ...overrides }
}

describe('reduce', () => {
  describe('IDENTITY_LOADED', () => {
    it('records the stored identity and marks bootstrapped from cold start', () => {
      const next = reduce(initialInternalState, {
        type: 'IDENTITY_LOADED',
        identity: identity('user-1')
      })
      expect(next.identity).toEqual(identity('user-1'))
      expect(next.identityBootstrapped).toBe(true)
    })

    it('marks bootstrapped even when no identity is stored', () => {
      const next = reduce(initialInternalState, {
        type: 'IDENTITY_LOADED',
        identity: null
      })
      expect(next.identity).toBeNull()
      expect(next.identityBootstrapped).toBe(true)
    })

    it('is a no-op once bootstrapped so a late SecureStore read cannot clobber', () => {
      const settled = state({
        identity: identity('fresh'),
        identityBootstrapped: true,
        status: 'valid'
      })
      expect(
        reduce(settled, {
          type: 'IDENTITY_LOADED',
          identity: identity('stale')
        })
      ).toBe(settled)
    })
  })

  describe('SESSION_SNAPSHOT', () => {
    it('mirrors the session and its pending flag', () => {
      const next = reduce(initialInternalState, {
        type: 'SESSION_SNAPSHOT',
        session: sessionNamed('Alice'),
        isPending: false
      })
      expect(next.session).toEqual(sessionNamed('Alice'))
      expect(next.sessionPending).toBe(false)
    })

    it('keeps pending true while Better Auth is still resolving', () => {
      const next = reduce(initialInternalState, {
        type: 'SESSION_SNAPSHOT',
        session: null,
        isPending: true
      })
      expect(next.session).toBeNull()
      expect(next.sessionPending).toBe(true)
    })
  })

  describe('REVALIDATED_VALID', () => {
    it('sets identity, bootstraps, and marks the session valid', () => {
      const next = reduce(state({ sessionPending: true }), {
        type: 'REVALIDATED_VALID',
        identity: identity('user-1')
      })
      expect(next).toMatchObject({
        identity: identity('user-1'),
        identityBootstrapped: true,
        status: 'valid',
        hasRevalidatedOnce: true
      })
    })
  })

  describe('REVALIDATED_EXPIRED', () => {
    it('marks status expired and preserves the existing identity', () => {
      const next = reduce(state({ identity: identity('user-1') }), {
        type: 'REVALIDATED_EXPIRED'
      })
      expect(next.status).toBe('expired')
      expect(next.hasRevalidatedOnce).toBe(true)
      expect(next.identity).toEqual(identity('user-1'))
    })
  })

  describe('REVALIDATED_NOOP', () => {
    it('only records that a revalidation ran, leaving status untouched', () => {
      const before = state({ identity: identity('user-1'), status: 'valid' })
      const next = reduce(before, { type: 'REVALIDATED_NOOP' })
      expect(next.hasRevalidatedOnce).toBe(true)
      expect(next.status).toBe('valid')
      expect(next.identity).toEqual(identity('user-1'))
    })
  })

  describe('MARK_EXPIRED', () => {
    it('flips status to expired while preserving identity', () => {
      const before = state({ identity: identity('user-1'), status: 'valid' })
      const next = reduce(before, { type: 'MARK_EXPIRED' })
      expect(next.status).toBe('expired')
      expect(next.identity).toEqual(identity('user-1'))
    })
  })

  describe('CLEARED', () => {
    it('drops identity, stays bootstrapped, and resets status to unknown', () => {
      const before = state({
        identity: identity('user-1'),
        identityBootstrapped: true,
        status: 'valid'
      })
      const next = reduce(before, { type: 'CLEARED' })
      expect(next.identity).toBeNull()
      expect(next.identityBootstrapped).toBe(true)
      expect(next.status).toBe('unknown')
    })
  })
})

describe('derivePhase', () => {
  it('is loading until identity bootstraps', () => {
    expect(derivePhase(initialInternalState)).toBe('loading')
  })

  it('stays loading after bootstrap while the session resolves and nothing has revalidated', () => {
    expect(
      derivePhase(
        state({
          identityBootstrapped: true,
          identity: null,
          sessionPending: true,
          hasRevalidatedOnce: false
        })
      )
    ).toBe('loading')
  })

  it('is anonymous once bootstrapped with no identity and a settled session', () => {
    expect(
      derivePhase(
        state({
          identityBootstrapped: true,
          identity: null,
          sessionPending: false
        })
      )
    ).toBe('anonymous')
  })

  it('is anonymous with no identity once a revalidation has run, even while pending', () => {
    expect(
      derivePhase(
        state({
          identityBootstrapped: true,
          identity: null,
          sessionPending: true,
          hasRevalidatedOnce: true
        })
      )
    ).toBe('anonymous')
  })

  it('is incomplete-profile when identity exists but the session name is blank', () => {
    expect(
      derivePhase(
        state({
          identityBootstrapped: true,
          identity: identity('user-1'),
          session: sessionNamed('')
        })
      )
    ).toBe('incomplete-profile')
  })

  it('treats a whitespace-only name as an incomplete profile', () => {
    expect(
      derivePhase(
        state({
          identityBootstrapped: true,
          identity: identity('user-1'),
          session: sessionNamed('   ')
        })
      )
    ).toBe('incomplete-profile')
  })

  it('is authenticated when identity and a named session are present', () => {
    expect(
      derivePhase(
        state({
          identityBootstrapped: true,
          identity: identity('user-1'),
          session: sessionNamed('Alice')
        })
      )
    ).toBe('authenticated')
  })

  it('is authenticated when identity exists but no session snapshot has arrived yet', () => {
    expect(
      derivePhase(
        state({
          identityBootstrapped: true,
          identity: identity('user-1'),
          session: null
        })
      )
    ).toBe('authenticated')
  })
})
