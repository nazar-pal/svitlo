import { eq } from 'drizzle-orm'

import { generatorSessions } from '@/data/client/db-schema/generators'

import { createTestDatabase, resetDatabase, closeDatabase } from './test-db'
import {
  IDS,
  seedBaseScenario,
  seedGenerator,
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
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }))

import {
  startSession,
  stopSession,
  deleteSession,
  updateSession,
  logManualSession
} from '../sessions'

beforeEach(() => {
  resetDatabase(mockTestDb.sqlite)
  mockIdCounter = 0
  seedBaseScenario(mockTestDb.db)
  seedGenerator(mockTestDb.db)
})

afterAll(() => closeDatabase(mockTestDb.sqlite))

// Boundary-only tests for the PowerSync SQLite adapter layer. Full
// enumeration of rule branches (missing generator, already stopped, time
// ordering, future end time, etc.) lives in
// `src/data/shared/sessions/__tests__/policy-test.ts` and runs against the
// pure policy. These tests verify the two things the pure policy cannot:
//   1. The happy path writes the expected row through the real SQLite
//      adapter + mutation helpers (newId, nowISO, column mapping).
//   2. On a representative rejection, the adapter performs no partial write
//      — the pre-check short-circuits before `db.insert/update/delete`.

describe('startSession', () => {
  it('inserts an active session row on success', async () => {
    const result = await startSession(IDS.adminUser, IDS.generator)
    expect(result.ok).toBe(true)

    const rows = mockTestDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.generatorId, IDS.generator))
      .all()
    expect(rows).toHaveLength(1)
    expect(rows[0].startedByUserId).toBe(IDS.adminUser)
    expect(rows[0].stoppedAt).toBeNull()
  })

  it('rejects outsider and does not create a session', async () => {
    const result = await startSession(IDS.outsiderUser, IDS.generator)
    expect(result.ok).toBe(false)

    const rows = mockTestDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.generatorId, IDS.generator))
      .all()
    expect(rows).toHaveLength(0)
  })
})

describe('stopSession', () => {
  it('updates stoppedAt and stoppedByUserId on success', async () => {
    seedActiveSession(mockTestDb.db)
    const result = await stopSession(IDS.adminUser, IDS.session.active)
    expect(result.ok).toBe(true)

    const [session] = mockTestDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.id, IDS.session.active))
      .all()
    expect(session.stoppedAt).not.toBeNull()
    expect(session.stoppedByUserId).toBe(IDS.adminUser)
  })

  it('rejects outsider and leaves the session intact', async () => {
    seedActiveSession(mockTestDb.db)
    const result = await stopSession(IDS.outsiderUser, IDS.session.active)
    expect(result.ok).toBe(false)

    const [session] = mockTestDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.id, IDS.session.active))
      .all()
    expect(session.stoppedAt).toBeNull()
  })
})

describe('deleteSession', () => {
  it('removes the row on success', async () => {
    seedStoppedSession(mockTestDb.db)
    const result = await deleteSession(IDS.adminUser, IDS.session.stopped)
    expect(result.ok).toBe(true)

    const [row] = mockTestDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.id, IDS.session.stopped))
      .all()
    expect(row).toBeUndefined()
  })

  it('rejects outsider and leaves the session intact', async () => {
    seedStoppedSession(mockTestDb.db)
    const result = await deleteSession(IDS.outsiderUser, IDS.session.stopped)
    expect(result.ok).toBe(false)

    const [row] = mockTestDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.id, IDS.session.stopped))
      .all()
    expect(row).toBeDefined()
  })
})

describe('updateSession', () => {
  it('updates startedAt and stoppedAt on success', async () => {
    seedStoppedSession(mockTestDb.db)
    const result = await updateSession(IDS.adminUser, IDS.session.stopped, {
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(true)

    const [session] = mockTestDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.id, IDS.session.stopped))
      .all()
    expect(session.startedAt).toBe('2026-01-15T08:00:00Z')
    expect(session.stoppedAt).toBe('2026-01-15T10:00:00Z')
  })

  it('rejects outsider and leaves the session intact', async () => {
    seedStoppedSession(mockTestDb.db)
    const result = await updateSession(IDS.outsiderUser, IDS.session.stopped, {
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T09:00:00Z'
    })
    expect(result.ok).toBe(false)

    const [session] = mockTestDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.id, IDS.session.stopped))
      .all()
    expect(session.startedAt).toBe('2026-01-15T10:00:00Z')
    expect(session.stoppedAt).toBe('2026-01-15T12:00:00Z')
  })
})

describe('logManualSession', () => {
  it('inserts a completed session row on success', async () => {
    const result = await logManualSession(IDS.adminUser, {
      generatorId: IDS.generator,
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(true)

    const rows = mockTestDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.generatorId, IDS.generator))
      .all()
    expect(rows).toHaveLength(1)
    expect(rows[0].startedByUserId).toBe(IDS.adminUser)
    expect(rows[0].stoppedByUserId).toBe(IDS.adminUser)
    expect(rows[0].startedAt).toBe('2026-01-15T08:00:00Z')
    expect(rows[0].stoppedAt).toBe('2026-01-15T10:00:00Z')
  })

  it('rejects outsider and creates no session', async () => {
    const result = await logManualSession(IDS.outsiderUser, {
      generatorId: IDS.generator,
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-15T10:00:00Z'
    })
    expect(result.ok).toBe(false)

    const rows = mockTestDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.generatorId, IDS.generator))
      .all()
    expect(rows).toHaveLength(0)
  })
})
