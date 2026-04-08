import type { drizzle } from 'drizzle-orm/better-sqlite3'
import { renderHook, waitFor } from '@testing-library/react-native'

import {
  createTestDatabase,
  resetDatabase,
  closeDatabase
} from '@/data/client/mutations/__tests__/test-db'
import {
  IDS,
  seedBaseScenario,
  seedGenerator,
  seedAssignment,
  seedActiveSession,
  seedStoppedSession,
  seedMaintenanceTemplate,
  seedMaintenanceRecord
} from '@/data/client/mutations/__tests__/seed'
import { generators } from '@/data/client/db-schema/generators'

let mockDb: ReturnType<typeof drizzle>

jest.mock('@powersync/react-native', () =>
  require('@/lib/hooks/__tests__/mock-use-query').createUseQueryMock()
)

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockDb
  }
}))

jest.mock('@/lib/powersync', () => ({
  differential: () => ({})
}))

jest.mock('@/lib/organization/use-selected-org', () => ({
  useSelectedOrg: jest.fn()
}))

const { useSelectedOrg } = jest.requireMock<{
  useSelectedOrg: jest.Mock
}>('@/lib/organization/use-selected-org')

const { useGeneratorListData } = require('../use-generator-list-data')

beforeAll(async () => {
  const testDb = await createTestDatabase()
  mockDb = testDb.db
})

beforeEach(() => {
  jest.resetAllMocks()
  resetDatabase()
})

afterAll(() => {
  closeDatabase()
})

function setupMocks(orgId: string | null = IDS.org) {
  useSelectedOrg.mockReturnValue({
    selectedOrgId: orgId,
    setSelectedOrgId: jest.fn()
  })
}

describe('useGeneratorListData', () => {
  it('returns empty generators when no org selected', async () => {
    setupMocks(null)

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      expect(result.current.generators).toEqual([])
    })
  })

  it('returns generators for the selected org', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    setupMocks()

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      expect(result.current.generators).toHaveLength(1)
      expect(result.current.generators[0].id).toBe(IDS.generator)
    })
  })

  it('groups sessions by generator', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedActiveSession(mockDb)
    setupMocks()

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      const sessions = result.current.sessionsByGenerator.get(IDS.generator)
      expect(sessions).toHaveLength(1)
      expect(sessions[0].id).toBe(IDS.session.active)
    })
  })

  it('groups assignments by generator', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedAssignment(mockDb)
    setupMocks()

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      const assignments = result.current.assignmentsByGenerator.get(
        IDS.generator
      )
      expect(assignments).toHaveLength(1)
      expect(assignments[0].userId).toBe(IDS.memberUser)
    })
  })

  it('returns users', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    setupMocks()

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      expect(result.current.users.length).toBeGreaterThanOrEqual(3)
    })
  })

  it('computes next maintenance for generators with templates', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedMaintenanceTemplate(mockDb)
    setupMocks()

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      const next = result.current.nextMaintenanceByGenerator.get(IDS.generator)
      expect(next).not.toBeNull()
      expect(next.templateId).toBe(IDS.template)
      expect(next.taskName).toBe('Oil change')
    })
  })

  it('returns null next maintenance for generators without templates', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    setupMocks()

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      const next = result.current.nextMaintenanceByGenerator.get(IDS.generator)
      expect(next).toBeNull()
    })
  })

  it('excludes generators from other orgs', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    mockDb
      .insert(generators)
      .values({
        id: 'gen-other',
        organizationId: 'other-org',
        title: 'Other Gen',
        model: 'X',
        maxConsecutiveRunHours: 8,
        requiredRestHours: 4,
        runWarningThresholdPct: 80,
        createdAt: '2026-01-15T12:00:00Z'
      })
      .run()
    setupMocks()

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      expect(result.current.generators).toHaveLength(1)
      expect(result.current.generators[0].id).toBe(IDS.generator)
    })
  })

  it('includes all sessions in allSessions across generators', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedActiveSession(mockDb)
    seedStoppedSession(mockDb)
    setupMocks()

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      expect(result.current.allSessions).toHaveLength(2)
    })
  })

  it('next maintenance urgency reflects performed records', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-16T00:00:00Z'))

    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedMaintenanceTemplate(mockDb) // hours trigger, 100h interval
    seedMaintenanceRecord(mockDb) // performed at T
    setupMocks()

    const { result } = renderHook(() => useGeneratorListData())

    await waitFor(() => {
      const next = result.current.nextMaintenanceByGenerator.get(IDS.generator)
      expect(next).not.toBeNull()
      // No sessions since last record → 100h remaining → urgency should be 'ok'
      expect(next.urgency).toBe('ok')
    })

    jest.useRealTimers()
  })
})
