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
  seedMaintenanceTemplate
} from '@/data/client/mutations/__tests__/seed'
import { maintenanceTemplates } from '@/data/client/db-schema/maintenance'
import { generatorSessions } from '@/data/client/db-schema/generators'

let mockDb: ReturnType<typeof drizzle>

jest.mock('@powersync/react-native', () =>
  require('@/lib/hooks/__tests__/mock-use-query').createUseQueryMock()
)

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockDb
  }
}))

jest.mock('@/lib/generator/use-generator-scope', () => ({
  useGeneratorScope: jest.fn()
}))

const { useGeneratorScope } = jest.requireMock<{
  useGeneratorScope: jest.Mock
}>('@/lib/generator/use-generator-scope')

const { useMaintenanceTabData } = require('../use-maintenance-tab-data')

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

const defaultGenerator = {
  id: IDS.generator,
  organizationId: IDS.org,
  title: 'Honda EU2200i',
  model: 'EU2200i',
  description: null,
  maxConsecutiveRunHours: 8,
  requiredRestHours: 4,
  runWarningThresholdPct: 80,
  createdAt: '2026-01-15T12:00:00Z'
}

function setupMocks(overrides?: {
  availableGenerators?: (typeof defaultGenerator)[]
  visibleGeneratorIds?: Set<string>
  admin?: boolean
}) {
  useGeneratorScope.mockReturnValue({
    userOrgs: [{ id: IDS.org }],
    admin: overrides?.admin ?? true,
    availableGenerators: overrides?.availableGenerators ?? [defaultGenerator],
    effectiveScope: 'org',
    visibleGeneratorIds:
      overrides?.visibleGeneratorIds ?? new Set([IDS.generator]),
    setGeneratorScope: jest.fn()
  })
}

describe('useMaintenanceTabData', () => {
  it('returns isEmpty true when no templates exist', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    setupMocks()

    const { result } = renderHook(() => useMaintenanceTabData())

    await waitFor(() => {
      expect(result.current.isEmpty).toBe(true)
      expect(result.current.overdue).toEqual([])
      expect(result.current.dueSoon).toEqual([])
      expect(result.current.upcoming).toEqual([])
    })
  })

  it('categorizes overdue maintenance', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-06-01T00:00:00Z'))

    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    // Calendar trigger: 30 days from created_at (2026-01-15)
    mockDb
      .insert(maintenanceTemplates)
      .values({
        id: 'tmpl-overdue',
        generatorId: IDS.generator,
        taskName: 'Filter replacement',
        triggerType: 'calendar',
        triggerCalendarDays: 30,
        isOneTime: 0,
        createdAt: '2026-01-15T12:00:00Z'
      })
      .run()
    setupMocks()

    const { result } = renderHook(() => useMaintenanceTabData())

    await waitFor(() => {
      expect(result.current.overdue).toHaveLength(1)
      expect(result.current.overdue[0].taskName).toBe('Filter replacement')
      expect(result.current.isEmpty).toBe(false)
    })

    jest.useRealTimers()
  })

  it('categorizes due_soon maintenance', async () => {
    jest.useFakeTimers()
    // Set time so we're within 20% of the 100-day calendar interval
    // 100 days from 2026-01-15 = 2026-04-25. 20% of 100 = 20 days.
    // due_soon threshold: 2026-04-05. Set now to 2026-04-10 (within threshold).
    jest.setSystemTime(new Date('2026-04-10T00:00:00Z'))

    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    mockDb
      .insert(maintenanceTemplates)
      .values({
        id: 'tmpl-soon',
        generatorId: IDS.generator,
        taskName: 'Spark plug check',
        triggerType: 'calendar',
        triggerCalendarDays: 100,
        isOneTime: 0,
        createdAt: '2026-01-15T12:00:00Z'
      })
      .run()
    setupMocks()

    const { result } = renderHook(() => useMaintenanceTabData())

    await waitFor(() => {
      expect(result.current.dueSoon).toHaveLength(1)
      expect(result.current.dueSoon[0].taskName).toBe('Spark plug check')
    })

    jest.useRealTimers()
  })

  it('categorizes upcoming (ok) maintenance with remaining time', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-20T00:00:00Z'))

    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedMaintenanceTemplate(mockDb) // hours trigger, 100h interval, created 2026-01-15
    setupMocks()

    const { result } = renderHook(() => useMaintenanceTabData())

    await waitFor(() => {
      // No sessions → 100h remaining → ok urgency with hoursRemaining set
      expect(result.current.upcoming).toHaveLength(1)
      expect(result.current.upcoming[0].taskName).toBe('Oil change')
      expect(result.current.upcoming[0].urgency).toBe('ok')
    })

    jest.useRealTimers()
  })

  it('filters out generators not in visibleGeneratorIds', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-20T00:00:00Z'))

    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedMaintenanceTemplate(mockDb)
    setupMocks({ visibleGeneratorIds: new Set(['gen-other']) })

    const { result } = renderHook(() => useMaintenanceTabData())

    await waitFor(() => {
      expect(result.current.isEmpty).toBe(true)
    })

    jest.useRealTimers()
  })

  it('builds generatorsById map from visible generators', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    setupMocks()

    const { result } = renderHook(() => useMaintenanceTabData())

    await waitFor(() => {
      expect(result.current.generatorsById.get(IDS.generator)).toBeDefined()
      expect(result.current.generatorsById.get(IDS.generator).title).toBe(
        'Honda EU2200i'
      )
    })
  })

  it('excludes one-time templates already performed', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-20T00:00:00Z'))

    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    mockDb
      .insert(maintenanceTemplates)
      .values({
        id: 'tmpl-onetime',
        generatorId: IDS.generator,
        taskName: 'Initial break-in',
        triggerType: 'hours',
        triggerHoursInterval: 10,
        isOneTime: 1,
        createdAt: '2026-01-15T12:00:00Z'
      })
      .run()
    // Performed record exists for this one-time template
    mockDb
      .insert(
        (await import('@/data/client/db-schema/maintenance')).maintenanceRecords
      )
      .values({
        id: 'rec-onetime',
        templateId: 'tmpl-onetime',
        generatorId: IDS.generator,
        performedByUserId: IDS.adminUser,
        performedAt: '2026-01-16T12:00:00Z'
      })
      .run()
    setupMocks()

    const { result } = renderHook(() => useMaintenanceTabData())

    await waitFor(() => {
      // One-time template already performed → urgency 'ok' with null remaining
      // → filtered out of upcoming (which requires non-null remaining)
      expect(result.current.upcoming).toHaveLength(0)
      expect(result.current.overdue).toHaveLength(0)
      expect(result.current.dueSoon).toHaveLength(0)
      expect(result.current.isEmpty).toBe(true)
    })

    jest.useRealTimers()
  })

  it('hours-based template becomes overdue after enough session hours', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-20T00:00:00Z'))

    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedMaintenanceTemplate(mockDb) // hours trigger, 100h interval

    // Add a long stopped session: 120 hours
    mockDb
      .insert(generatorSessions)
      .values({
        id: 'session-long',
        generatorId: IDS.generator,
        startedByUserId: IDS.adminUser,
        stoppedByUserId: IDS.adminUser,
        startedAt: '2026-01-15T12:00:00Z',
        stoppedAt: '2026-01-20T12:00:00Z' // 120 hours
      })
      .run()
    setupMocks()

    const { result } = renderHook(() => useMaintenanceTabData())

    await waitFor(() => {
      // 120h of session time > 100h interval → overdue
      expect(result.current.overdue).toHaveLength(1)
      expect(result.current.overdue[0].taskName).toBe('Oil change')
    })

    jest.useRealTimers()
  })

  it('passes through scope control props', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    const setScope = jest.fn()
    useGeneratorScope.mockReturnValue({
      userOrgs: [{ id: IDS.org }],
      admin: true,
      availableGenerators: [defaultGenerator],
      effectiveScope: 'org',
      visibleGeneratorIds: new Set([IDS.generator]),
      setGeneratorScope: setScope
    })

    const { result } = renderHook(() => useMaintenanceTabData())

    await waitFor(() => {
      expect(result.current.admin).toBe(true)
      expect(result.current.userOrgs).toHaveLength(1)
      expect(result.current.setGeneratorScope).toBe(setScope)
    })
  })
})
