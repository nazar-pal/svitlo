import { createTestDatabase, resetDatabase, closeDatabase } from './test-db'
import {
  IDS,
  seedBaseScenario,
  seedGenerator,
  seedAssignment,
  seedActiveSession,
  seedStoppedSession
} from './seed'

let mockTestDb: Awaited<ReturnType<typeof createTestDatabase>>

beforeAll(async () => {
  mockTestDb = await createTestDatabase()
})

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockTestDb.db
  },
  get powersync() {
    return mockTestDb.powersync
  }
}))

let mockIdCounter = 0
jest.mock('../helpers', () => ({
  ...jest.requireActual('../helpers'),
  newId: jest.fn(() => `id-${++mockIdCounter}`)
}))

jest.mock('expo-crypto', () => ({ randomUUID: () => 'mock-uuid' }))
jest.mock('@/lib/i18n', () => ({ t: (key: string) => key }))
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }))

import {
  startSession,
  stopSession,
  deleteSession,
  updateSession,
  logManualSession
} from '../sessions'

beforeEach(() => {
  resetDatabase()
  mockIdCounter = 0
  seedBaseScenario(mockTestDb.sqlite)
  seedGenerator(mockTestDb.sqlite)
})

afterAll(() => closeDatabase())

// ── startSession ────────────────────────────────────────────────────────────

describe('startSession', () => {
  it('succeeds when admin starts a session', async () => {
    const result = await startSession(IDS.adminUser, IDS.generator)
    expect(result.ok).toBe(true)

    const rows = mockTestDb.sqlite
      .prepare('SELECT * FROM generator_sessions WHERE generator_id = ?')
      .all(IDS.generator) as {
      started_by_user_id: string
      stopped_at: string | null
    }[]
    expect(rows).toHaveLength(1)
    expect(rows[0].started_by_user_id).toBe(IDS.adminUser)
    expect(rows[0].stopped_at).toBeNull()
  })

  it('succeeds when assigned member starts a session', async () => {
    seedAssignment(mockTestDb.sqlite)
    const result = await startSession(IDS.memberUser, IDS.generator)
    expect(result.ok).toBe(true)
  })

  it('fails when outsider tries to start', async () => {
    const result = await startSession(IDS.outsiderUser, IDS.generator)
    expect(result.ok).toBe(false)
  })

  it('fails when generator does not exist', async () => {
    const result = await startSession(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })

  it('fails when session already active', async () => {
    seedActiveSession(mockTestDb.sqlite)
    const result = await startSession(IDS.adminUser, IDS.generator)
    expect(result.ok).toBe(false)
  })

  it('allows starting after previous session was stopped', async () => {
    seedStoppedSession(mockTestDb.sqlite)
    const result = await startSession(IDS.adminUser, IDS.generator)
    expect(result.ok).toBe(true)
  })
})

// ── stopSession ─────────────────────────────────────────────────────────────

describe('stopSession', () => {
  it('updates stoppedAt and stoppedByUserId', async () => {
    seedActiveSession(mockTestDb.sqlite)
    const result = await stopSession(IDS.adminUser, IDS.session.active)
    expect(result.ok).toBe(true)

    const session = mockTestDb.sqlite
      .prepare('SELECT * FROM generator_sessions WHERE id = ?')
      .get(IDS.session.active) as {
      stopped_at: string | null
      stopped_by_user_id: string | null
    }
    expect(session.stopped_at).not.toBeNull()
    expect(session.stopped_by_user_id).toBe(IDS.adminUser)
  })

  it('fails when session does not exist', async () => {
    const result = await stopSession(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })

  it('fails when session already stopped', async () => {
    seedStoppedSession(mockTestDb.sqlite)
    const result = await stopSession(IDS.adminUser, IDS.session.stopped)
    expect(result.ok).toBe(false)
  })

  it('fails when outsider tries to stop', async () => {
    seedActiveSession(mockTestDb.sqlite)
    const result = await stopSession(IDS.outsiderUser, IDS.session.active)
    expect(result.ok).toBe(false)
  })

  it('succeeds when assigned member stops a session', async () => {
    seedActiveSession(mockTestDb.sqlite)
    seedAssignment(mockTestDb.sqlite)
    const result = await stopSession(IDS.memberUser, IDS.session.active)
    expect(result.ok).toBe(true)
  })
})

// ── deleteSession ───────────────────────────────────────────────────────────

describe('deleteSession', () => {
  it('deletes a stopped session', async () => {
    seedStoppedSession(mockTestDb.sqlite)
    const result = await deleteSession(IDS.adminUser, IDS.session.stopped)
    expect(result.ok).toBe(true)

    const row = mockTestDb.sqlite
      .prepare('SELECT * FROM generator_sessions WHERE id = ?')
      .get(IDS.session.stopped)
    expect(row).toBeUndefined()
  })

  it('fails when session does not exist', async () => {
    const result = await deleteSession(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })

  it('fails when session is still active', async () => {
    seedActiveSession(mockTestDb.sqlite)
    const result = await deleteSession(IDS.adminUser, IDS.session.active)
    expect(result.ok).toBe(false)
  })

  it('fails when outsider tries to delete', async () => {
    seedStoppedSession(mockTestDb.sqlite)
    const result = await deleteSession(IDS.outsiderUser, IDS.session.stopped)
    expect(result.ok).toBe(false)
  })
})

// ── updateSession ───────────────────────────────────────────────────────────

describe('updateSession', () => {
  it('updates startedAt and stoppedAt on a stopped session', async () => {
    seedStoppedSession(mockTestDb.sqlite)
    const result = await updateSession(IDS.adminUser, IDS.session.stopped, {
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(true)

    const session = mockTestDb.sqlite
      .prepare('SELECT * FROM generator_sessions WHERE id = ?')
      .get(IDS.session.stopped) as {
      started_at: string
      stopped_at: string
    }
    expect(session.started_at).toBe('2026-01-15T08:00:00Z')
    expect(session.stopped_at).toBe('2026-01-15T10:00:00Z')
  })

  it('fails when session does not exist', async () => {
    const result = await updateSession(IDS.adminUser, 'nonexistent', {
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when session is still active', async () => {
    seedActiveSession(mockTestDb.sqlite)
    const result = await updateSession(IDS.adminUser, IDS.session.active, {
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when outsider tries to update', async () => {
    seedStoppedSession(mockTestDb.sqlite)
    const result = await updateSession(IDS.outsiderUser, IDS.session.stopped, {
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when startedAt >= stoppedAt', async () => {
    seedStoppedSession(mockTestDb.sqlite)
    const result = await updateSession(IDS.adminUser, IDS.session.stopped, {
      startedAt: '2026-01-15T12:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when stoppedAt is in the future', async () => {
    seedStoppedSession(mockTestDb.sqlite)
    const result = await updateSession(IDS.adminUser, IDS.session.stopped, {
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2099-01-01T00:00:00Z'
    })
    expect(result.ok).toBe(false)
  })
})

// ── logManualSession ────────────────────────────────────────────────────────

describe('logManualSession', () => {
  it('inserts a completed session for admin', async () => {
    const result = await logManualSession(IDS.adminUser, {
      generatorId: IDS.generator,
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(true)

    const rows = mockTestDb.sqlite
      .prepare('SELECT * FROM generator_sessions WHERE generator_id = ?')
      .all(IDS.generator) as {
      started_by_user_id: string
      stopped_by_user_id: string
      started_at: string
      stopped_at: string
    }[]
    expect(rows).toHaveLength(1)
    expect(rows[0].started_by_user_id).toBe(IDS.adminUser)
    expect(rows[0].stopped_by_user_id).toBe(IDS.adminUser)
    expect(rows[0].started_at).toBe('2026-01-15T08:00:00Z')
    expect(rows[0].stopped_at).toBe('2026-01-15T10:00:00Z')
  })

  it('succeeds for assigned member', async () => {
    seedAssignment(mockTestDb.sqlite)
    const result = await logManualSession(IDS.memberUser, {
      generatorId: IDS.generator,
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(true)
  })

  it('fails when generator does not exist', async () => {
    const result = await logManualSession(IDS.adminUser, {
      generatorId: 'nonexistent',
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when outsider tries to log', async () => {
    const result = await logManualSession(IDS.outsiderUser, {
      generatorId: IDS.generator,
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when startedAt >= stoppedAt', async () => {
    const result = await logManualSession(IDS.adminUser, {
      generatorId: IDS.generator,
      startedAt: '2026-01-15T12:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when stoppedAt is in the future', async () => {
    const result = await logManualSession(IDS.adminUser, {
      generatorId: IDS.generator,
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2099-01-01T00:00:00Z'
    })
    expect(result.ok).toBe(false)
  })
})
