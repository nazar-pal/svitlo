import type { AuthzChecks } from '@/data/shared/authz'

import {
  createSessionLifecycleChecks,
  type SessionLifecycleChecks
} from '../checks'
import type { SessionFactsProvider, SessionRef } from '../facts'

// Glue-level tests only: verify that the orchestrator fetches the right
// facts and forwards them (plus the caller's input and `now`) to the right
// policy function. Full enumeration of policy branches lives in
// `policy-test.ts`; duplicating it here would just add layers to the same
// assertions against the same error codes.

const USER = 'user-1'
const GENERATOR = 'gen-1'
const SESSION = 'session-1'
const NOW = new Date('2026-04-10T12:00:00.000Z')

const STOPPED_SESSION: SessionRef = {
  generatorId: GENERATOR,
  startedByUserId: USER,
  isStopped: true
}

const ACTIVE_SESSION: SessionRef = {
  generatorId: GENERATOR,
  startedByUserId: USER,
  isStopped: false
}

const validTimes = {
  startedAt: '2026-04-10T10:00:00.000Z',
  stoppedAt: '2026-04-10T11:00:00.000Z'
}

const futureStop = {
  startedAt: '2026-04-10T10:00:00.000Z',
  stoppedAt: '2026-04-10T13:00:00.000Z'
}

function makeFacts(
  overrides: Partial<SessionFactsProvider> = {}
): SessionFactsProvider {
  return {
    async findSession() {
      return null
    },
    async generatorExists() {
      return true
    },
    async hasOpenSessionForGenerator() {
      return false
    },
    ...overrides
  }
}

function makeAuthz(overrides: Partial<AuthzChecks> = {}): AuthzChecks {
  return {
    async canAccessGenerator() {
      return true
    },
    async isOrgAdmin() {
      return false
    },
    async isGeneratorOrgAdmin() {
      return false
    },
    ...overrides
  }
}

describe('createSessionLifecycleChecks', () => {
  describe('startSession', () => {
    it('fetches all three facts and forwards them to the policy', async () => {
      const generatorExists = jest.fn(async () => true)
      const hasOpenSessionForGenerator = jest.fn(async () => false)
      const canAccessGenerator = jest.fn(async () => true)
      const checks = createSessionLifecycleChecks(
        makeFacts({ generatorExists, hasOpenSessionForGenerator }),
        makeAuthz({ canAccessGenerator })
      )
      expect(await checks.startSession(USER, GENERATOR)).toEqual({ ok: true })
      expect(generatorExists).toHaveBeenCalledWith(GENERATOR)
      expect(canAccessGenerator).toHaveBeenCalledWith(USER, GENERATOR)
      expect(hasOpenSessionForGenerator).toHaveBeenCalledWith(GENERATOR)
    })
  })

  // stop/delete/update share the same fetch-then-conditional-authz shape.
  // Parametrise the short-circuit test so every method is covered without
  // repeating boilerplate.
  describe.each([
    [
      'stopSession',
      (c: SessionLifecycleChecks) => c.stopSession(USER, SESSION)
    ],
    [
      'deleteSession',
      (c: SessionLifecycleChecks) => c.deleteSession(USER, SESSION)
    ],
    [
      'updateSession',
      (c: SessionLifecycleChecks) =>
        c.updateSession(USER, SESSION, validTimes, NOW)
    ]
  ] as const)('%s', (_label, call) => {
    it('short-circuits SESSION_NOT_FOUND without calling authz', async () => {
      const canAccessGenerator = jest.fn(async () => true)
      const checks = createSessionLifecycleChecks(
        makeFacts({}),
        makeAuthz({ canAccessGenerator })
      )
      expect(await call(checks)).toEqual({
        ok: false,
        code: 'SESSION_NOT_FOUND'
      })
      expect(canAccessGenerator).not.toHaveBeenCalled()
    })
  })

  describe('stopSession', () => {
    it('passes the fetched session and authz result into stopSessionPolicy', async () => {
      const canAccessGenerator = jest.fn(async () => true)
      const checks = createSessionLifecycleChecks(
        makeFacts({
          async findSession() {
            return ACTIVE_SESSION
          }
        }),
        makeAuthz({ canAccessGenerator })
      )
      expect(await checks.stopSession(USER, SESSION)).toEqual({ ok: true })
      expect(canAccessGenerator).toHaveBeenCalledWith(USER, GENERATOR)
    })
  })

  describe('deleteSession', () => {
    it('passes the fetched session and authz result into deleteSessionPolicy', async () => {
      const canAccessGenerator = jest.fn(async () => true)
      const checks = createSessionLifecycleChecks(
        makeFacts({
          async findSession() {
            return STOPPED_SESSION
          }
        }),
        makeAuthz({ canAccessGenerator })
      )
      // On success, deleteSession surfaces the fetched session so server
      // callers can reuse it for defence-in-depth ownership checks.
      expect(await checks.deleteSession(USER, SESSION)).toEqual({
        ok: true,
        session: STOPPED_SESSION
      })
      expect(canAccessGenerator).toHaveBeenCalledWith(USER, GENERATOR)
    })
  })

  describe('updateSession', () => {
    it('forwards input and now into updateSessionPolicy', async () => {
      const checks = createSessionLifecycleChecks(
        makeFacts({
          async findSession() {
            return STOPPED_SESSION
          }
        }),
        makeAuthz({})
      )
      // A future `stoppedAt` vs NOW triggers END_TIME_IN_FUTURE, proving
      // that both the input and `now` arguments were piped through.
      expect(
        await checks.updateSession(USER, SESSION, futureStop, NOW)
      ).toEqual({
        ok: false,
        code: 'END_TIME_IN_FUTURE'
      })
    })
  })

  describe('logManualSession', () => {
    it('forwards input and now into logManualSessionPolicy', async () => {
      const checks = createSessionLifecycleChecks(makeFacts({}), makeAuthz({}))
      expect(
        await checks.logManualSession(
          USER,
          { generatorId: GENERATOR, ...futureStop },
          NOW
        )
      ).toEqual({ ok: false, code: 'END_TIME_IN_FUTURE' })
    })
  })
})
