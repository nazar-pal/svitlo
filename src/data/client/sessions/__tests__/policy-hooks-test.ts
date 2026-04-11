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
// builders, which in turn pulls `@/lib/powersync` for ancillary exports. Stub
// it with an empty module to avoid loading native dependencies.
jest.mock('@/lib/powersync', () => ({}))

const {
  useCanStartSession,
  useCanStopSession,
  useCanUpdateSession,
  useCanLogManualSession
} = require('../policy-hooks')

const {
  createClientSessionFactsProvider
} = require('@/data/client/sessions/provider')
const { createClientAuthzProvider } = require('@/data/client/authz/provider')
const { createAuthzChecks } = require('@/data/shared/authz')
const { createSessionLifecycleChecks } = require('@/data/shared/sessions')

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
  resetDatabase(mockSqlite)
})

afterAll(() => {
  closeDatabase(mockSqlite)
})

function buildChecks() {
  const authz = createAuthzChecks(createClientAuthzProvider(mockDb))
  return createSessionLifecycleChecks(
    createClientSessionFactsProvider(mockDb),
    authz
  )
}

// ── useCanStartSession ──────────────────────────────────────────────────────

describe('useCanStartSession', () => {
  it('reports loading when inputs are missing', () => {
    const { result } = renderHook(() => useCanStartSession(null, null))
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with GENERATOR_NOT_FOUND when the generator does not exist', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanStartSession(IDS.adminUser, IDS.generator)
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
      useCanStartSession(IDS.outsiderUser, IDS.generator)
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
      useCanStartSession(IDS.adminUser, IDS.generator)
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
      useCanStartSession(IDS.adminUser, IDS.generator)
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
      useCanStartSession(IDS.memberUser, IDS.generator)
    )

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

// ── useCanStopSession ───────────────────────────────────────────────────────

describe('useCanStopSession', () => {
  it('reports loading when inputs are missing', () => {
    const { result } = renderHook(() => useCanStopSession(null, null))
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with SESSION_NOT_FOUND when no row exists', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)

    const { result } = renderHook(() =>
      useCanStopSession(IDS.adminUser, 'does-not-exist')
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
      useCanStopSession(IDS.adminUser, IDS.session.stopped)
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
      useCanStopSession(IDS.outsiderUser, IDS.session.active)
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
      useCanStopSession(IDS.adminUser, IDS.session.active)
    )

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

// ── useCanUpdateSession ─────────────────────────────────────────────────────

describe('useCanUpdateSession', () => {
  it('reports loading when input is missing', () => {
    const { result } = renderHook(() =>
      useCanUpdateSession(IDS.adminUser, IDS.session.stopped, null)
    )
    expect(result.current).toEqual({ status: 'loading' })
  })

  // Regression lock: when the session row doesn't exist, `useSessionPolicyContext`
  // must short-circuit to a ready verdict instead of waiting on the authz
  // subscription (which gets called with a null generatorId and stays loading
  // forever). If that early return regresses, this test times out.
  it('rejects with SESSION_NOT_FOUND when no row exists', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)

    const { result } = renderHook(() =>
      useCanUpdateSession(IDS.adminUser, 'does-not-exist', VALID_INPUT)
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
      useCanUpdateSession(IDS.adminUser, IDS.session.active, VALID_INPUT)
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
      useCanUpdateSession(IDS.adminUser, IDS.session.stopped, {
        startedAt: '2026-01-15T12:00:00Z',
        stoppedAt: '2026-01-15T11:00:00Z'
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

    const futureEnd = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const { result } = renderHook(() =>
      useCanUpdateSession(IDS.adminUser, IDS.session.stopped, {
        startedAt: '2026-01-15T10:00:00Z',
        stoppedAt: futureEnd
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
      useCanUpdateSession(IDS.adminUser, IDS.session.stopped, VALID_INPUT)
    )

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

// ── useCanLogManualSession ──────────────────────────────────────────────────

describe('useCanLogManualSession', () => {
  it('reports loading when input is missing', () => {
    const { result } = renderHook(() =>
      useCanLogManualSession(IDS.adminUser, null)
    )
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with GENERATOR_NOT_FOUND when the generator is missing', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanLogManualSession(IDS.adminUser, {
        generatorId: IDS.generator,
        ...VALID_INPUT
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
      useCanLogManualSession(IDS.outsiderUser, {
        generatorId: IDS.generator,
        ...VALID_INPUT
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

  it('rejects with START_BEFORE_END when timestamps are inverted', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)

    const { result } = renderHook(() =>
      useCanLogManualSession(IDS.adminUser, {
        generatorId: IDS.generator,
        startedAt: '2026-01-15T12:00:00Z',
        stoppedAt: '2026-01-15T11:00:00Z'
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

  it('accepts the happy path', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)

    const { result } = renderHook(() =>
      useCanLogManualSession(IDS.adminUser, {
        generatorId: IDS.generator,
        ...VALID_INPUT
      })
    )

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

// ── Re-subscribe on input change ────────────────────────────────────────────
// Confirms the subscription pattern: when the caller passes a different
// generatorId the hook re-emits with a policy result for the new inputs, not
// a stale one. Stand-in for "true" reactivity (PowerSync's watch layer is
// owned by @powersync/react-native and not our hook code).

describe('useCanStartSession (re-subscribe on input change)', () => {
  it('recomputes when the generatorId changes', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    // Second generator in a different org — admin has no access.
    const { generators } = require('@/data/client/db-schema/generators')
    mockDb
      .insert(generators)
      .values({
        id: 'gen-other',
        organizationId: 'org-other',
        title: 'Other',
        model: 'X',
        maxConsecutiveRunHours: 8,
        requiredRestHours: 4,
        runWarningThresholdPct: 80,
        createdAt: '2026-01-15T12:00:00Z'
      })
      .run()

    const { result, rerender } = renderHook(
      ({ generatorId }: { generatorId: string }) =>
        useCanStartSession(IDS.adminUser, generatorId),
      { initialProps: { generatorId: IDS.generator } }
    )

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })

    rerender({ generatorId: 'gen-other' })

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'NOT_AUTHORIZED_FOR_GENERATOR'
      })
    })
  })
})

// ── Parity: hook vs async SessionLifecycleChecks ────────────────────────────
// Guardrail against drift between the reactive SQL-to-facts mapping and the
// async FactsProvider that the mutation path uses.

describe('parity with SessionLifecycleChecks', () => {
  it('startSession: hook matches check for assigned member', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedAssignment(mockDb)

    const { result } = renderHook(() =>
      useCanStartSession(IDS.memberUser, IDS.generator)
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const checks = buildChecks()
    const check = await checks.startSession(IDS.memberUser, IDS.generator)

    expect(result.current).toEqual({ status: 'ready', ...check })
  })

  it('stopSession: hook matches check for open session', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedActiveSession(mockDb)

    const { result } = renderHook(() =>
      useCanStopSession(IDS.adminUser, IDS.session.active)
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const checks = buildChecks()
    const check = await checks.stopSession(IDS.adminUser, IDS.session.active)

    expect(result.current).toEqual({ status: 'ready', ...check })
  })

  it('updateSession: hook matches check for stopped session', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedStoppedSession(mockDb)

    const { result } = renderHook(() =>
      useCanUpdateSession(IDS.adminUser, IDS.session.stopped, VALID_INPUT)
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const checks = buildChecks()
    const check = await checks.updateSession(
      IDS.adminUser,
      IDS.session.stopped,
      VALID_INPUT,
      new Date()
    )

    expect(result.current).toEqual({ status: 'ready', ...check })
  })

  it('logManualSession: hook matches check for happy path', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)

    const { result } = renderHook(() =>
      useCanLogManualSession(IDS.adminUser, {
        generatorId: IDS.generator,
        ...VALID_INPUT
      })
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const checks = buildChecks()
    const check = await checks.logManualSession(
      IDS.adminUser,
      { generatorId: IDS.generator, ...VALID_INPUT },
      new Date()
    )

    expect(result.current).toEqual({ status: 'ready', ...check })
  })
})
