import type Database from 'better-sqlite3'
import type { drizzle } from 'drizzle-orm/better-sqlite3'
import { renderHook, waitFor } from '@testing-library/react-native'

import {
  IDS,
  seedActiveSession,
  seedAssignment,
  seedBaseScenario,
  seedGenerator,
  seedStoppedSession
} from '@/data/client/mutations/__tests__/seed'
import {
  closeDatabase,
  createTestDatabase,
  resetDatabase
} from '@/data/client/mutations/__tests__/test-db'
import { stripFacts } from './strip-facts'

let mockDb: ReturnType<typeof drizzle>
let mockSqlite: Database.Database

jest.mock('@powersync/react-native', () =>
  require('@/lib/hooks/__tests__/mock-use-query').createUseQueryMock()
)

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockDb
  }
}))

// The hooks transitively pull `@/lib/powersync/database` via the query
// builders, which in turn pulls `@/lib/powersync` for ancillary exports.
// Stub it with an empty module to avoid loading native dependencies.
jest.mock('@/lib/powersync', () => ({}))

const { policies, usePolicy } = require('@/data/client/use-policy')
const { clientLookup } = require('@/data/client/registry')
const { runDecisionAsync } = require('@/data/shared/facts/async-adapter')
const sessionsD = require('@/data/shared/sessions/decisions')

const VALID_INPUT = {
  startedAt: '2026-01-15T10:00:00Z',
  stoppedAt: '2026-01-15T11:00:00Z'
} as const

beforeAll(async () => {
  const testDb = await createTestDatabase()
  mockDb = testDb.db
  mockSqlite = testDb.sqlite
})

beforeEach(() => {
  jest.resetAllMocks()
  resetDatabase(mockSqlite)
})

afterAll(() => {
  closeDatabase(mockSqlite)
})

// ── usePolicy(sessions.startSession) ────────────────────────────────────────

describe('usePolicy(sessions.startSession)', () => {
  it('reports loading when args are null', () => {
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.startSession, null)
    )
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with GENERATOR_NOT_FOUND when the generator does not exist', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.startSession, {
        userId: IDS.adminUser,
        generatorId: IDS.generator
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'GENERATOR_NOT_FOUND'
      })
    })
  })

  it('rejects with NOT_AUTHORIZED_FOR_GENERATOR for an outsider', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.startSession, {
        userId: IDS.outsiderUser,
        generatorId: IDS.generator
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'NOT_AUTHORIZED_FOR_GENERATOR'
      })
    })
  })

  it('rejects with GENERATOR_ALREADY_ACTIVE when an open session exists', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedActiveSession(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.startSession, {
        userId: IDS.adminUser,
        generatorId: IDS.generator
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'GENERATOR_ALREADY_ACTIVE'
      })
    })
  })

  it('accepts the happy path for an org admin', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.startSession, {
        userId: IDS.adminUser,
        generatorId: IDS.generator
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })

  it('accepts the happy path for an assigned member', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedAssignment(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.startSession, {
        userId: IDS.memberUser,
        generatorId: IDS.generator
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

// ── usePolicy(sessions.stopSession) ─────────────────────────────────────────

describe('usePolicy(sessions.stopSession)', () => {
  it('reports loading when args are null', () => {
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.stopSession, null)
    )
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with SESSION_NOT_FOUND when no row exists', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.stopSession, {
        userId: IDS.adminUser,
        sessionId: 'does-not-exist'
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'SESSION_NOT_FOUND'
      })
    })
  })

  it('rejects with SESSION_ALREADY_STOPPED on a closed session', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedStoppedSession(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.stopSession, {
        userId: IDS.adminUser,
        sessionId: IDS.session.stopped
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'SESSION_ALREADY_STOPPED'
      })
    })
  })

  it('rejects with NOT_AUTHORIZED_FOR_GENERATOR for an outsider', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedActiveSession(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.stopSession, {
        userId: IDS.outsiderUser,
        sessionId: IDS.session.active
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'NOT_AUTHORIZED_FOR_GENERATOR'
      })
    })
  })

  it('accepts the happy path on an active session', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedActiveSession(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.stopSession, {
        userId: IDS.adminUser,
        sessionId: IDS.session.active
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

// ── usePolicy(sessions.updateSession) ───────────────────────────────────────

describe('usePolicy(sessions.updateSession)', () => {
  it('reports loading when args are null', () => {
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.updateSession, null)
    )
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with SESSION_NOT_FOUND when no row exists', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.updateSession, {
        userId: IDS.adminUser,
        sessionId: 'does-not-exist',
        ...VALID_INPUT,
        now: new Date()
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'SESSION_NOT_FOUND'
      })
    })
  })

  it('rejects with CANNOT_EDIT_ACTIVE_SESSION on an open session', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedActiveSession(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.updateSession, {
        userId: IDS.adminUser,
        sessionId: IDS.session.active,
        ...VALID_INPUT,
        now: new Date()
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'CANNOT_EDIT_ACTIVE_SESSION'
      })
    })
  })

  it('rejects with START_BEFORE_END when timestamps are inverted', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedStoppedSession(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.updateSession, {
        userId: IDS.adminUser,
        sessionId: IDS.session.stopped,
        startedAt: '2026-01-15T12:00:00Z',
        stoppedAt: '2026-01-15T11:00:00Z',
        now: new Date()
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'START_BEFORE_END'
      })
    })
  })

  it('rejects with END_TIME_IN_FUTURE when stoppedAt is beyond now', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedStoppedSession(mockDb)
    const now = new Date()
    const futureEnd = new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.updateSession, {
        userId: IDS.adminUser,
        sessionId: IDS.session.stopped,
        startedAt: '2026-01-15T10:00:00Z',
        stoppedAt: futureEnd,
        now
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'END_TIME_IN_FUTURE'
      })
    })
  })

  it('accepts the happy path', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedStoppedSession(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.updateSession, {
        userId: IDS.adminUser,
        sessionId: IDS.session.stopped,
        ...VALID_INPUT,
        now: new Date()
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

// ── usePolicy(sessions.logManualSession) ────────────────────────────────────

describe('usePolicy(sessions.logManualSession)', () => {
  it('reports loading when args are null', () => {
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.logManualSession, null)
    )
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with GENERATOR_NOT_FOUND when the generator is missing', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.logManualSession, {
        userId: IDS.adminUser,
        generatorId: IDS.generator,
        ...VALID_INPUT,
        now: new Date()
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'GENERATOR_NOT_FOUND'
      })
    })
  })

  it('accepts the happy path', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.logManualSession, {
        userId: IDS.adminUser,
        generatorId: IDS.generator,
        ...VALID_INPUT,
        now: new Date()
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

// ── Parity ──────────────────────────────────────────────────────────────────
// Guardrail against drift between the reactive SQL-to-facts mapping and the
// async decision path (same plan both sides, but different resolver
// registries). Strip `facts` from the async result before comparing — the
// reactive `PolicyView` omits facts by design.

describe('parity with async decisions', () => {
  it('startSession: hook matches async for assigned member', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedAssignment(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.startSession, {
        userId: IDS.memberUser,
        generatorId: IDS.generator
      })
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    const check = await runDecisionAsync(
      sessionsD.startSession,
      { userId: IDS.memberUser, generatorId: IDS.generator },
      clientLookup(mockDb)
    )
    expect(result.current).toEqual(stripFacts(check))
  })

  it('stopSession: hook matches async for open session', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedActiveSession(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.sessions.stopSession, {
        userId: IDS.adminUser,
        sessionId: IDS.session.active
      })
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    const check = await runDecisionAsync(
      sessionsD.stopSession,
      { userId: IDS.adminUser, sessionId: IDS.session.active },
      clientLookup(mockDb)
    )
    expect(result.current).toEqual(stripFacts(check))
  })
})
