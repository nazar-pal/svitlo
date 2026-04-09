import type Database from 'better-sqlite3'
import type { drizzle } from 'drizzle-orm/better-sqlite3'
import { act, renderHook, waitFor } from '@testing-library/react-native'

import {
  createTestDatabase,
  resetDatabase,
  closeDatabase
} from '@/data/client/mutations/__tests__/test-db'
import {
  IDS,
  seedBaseScenario,
  seedGenerator,
  seedAssignment
} from '@/data/client/mutations/__tests__/seed'
import {
  generators,
  generatorUserAssignments
} from '@/data/client/db-schema/generators'

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

jest.mock('@/lib/organization/use-selected-org', () => ({
  useSelectedOrg: jest.fn()
}))

jest.mock('@/lib/organization/use-user-orgs', () => ({
  useUserOrgs: jest.fn()
}))

const { useSelectedOrg } = jest.requireMock<{
  useSelectedOrg: jest.Mock
}>('@/lib/organization/use-selected-org')

const { useUserOrgs } = jest.requireMock<{
  useUserOrgs: jest.Mock
}>('@/lib/organization/use-user-orgs')

const { useGeneratorScope } = require('../use-generator-scope')

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

function setupMocks(overrides?: {
  selectedOrgId?: string | null
  userId?: string
  isAdmin?: boolean
}) {
  const orgId = overrides?.selectedOrgId ?? IDS.org
  const userId = overrides?.userId ?? IDS.adminUser
  const admin = overrides?.isAdmin ?? true

  useSelectedOrg.mockReturnValue({
    selectedOrgId: orgId,
    setSelectedOrgId: jest.fn()
  })

  useUserOrgs.mockReturnValue({
    userOrgs: orgId ? [{ id: orgId }] : [],
    isAdmin: (id: string | null) => admin && id === orgId,
    userId
  })
}

describe('useGeneratorScope', () => {
  it('admin sees all org generators by default', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    setupMocks()

    const { result } = renderHook(() => useGeneratorScope())

    await waitFor(() => {
      expect(result.current.availableGenerators).toHaveLength(1)
      expect(result.current.effectiveScope).toBe('org')
      expect(result.current.visibleGeneratorIds.has(IDS.generator)).toBe(true)
    })
  })

  it('member sees only assigned generators by default', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    seedAssignment(mockDb, IDS.memberUser)
    setupMocks({ userId: IDS.memberUser, isAdmin: false })

    const { result } = renderHook(() => useGeneratorScope())

    await waitFor(() => {
      expect(result.current.availableGenerators).toHaveLength(1)
      expect(result.current.effectiveScope).toBe('my')
      expect(result.current.visibleGeneratorIds.has(IDS.generator)).toBe(true)
    })
  })

  it('member without assignments sees empty list', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    setupMocks({ userId: IDS.memberUser, isAdmin: false })

    const { result } = renderHook(() => useGeneratorScope())

    await waitFor(() => {
      expect(result.current.availableGenerators).toHaveLength(0)
      expect(result.current.visibleGeneratorIds.size).toBe(0)
    })
  })

  it('no org selected returns empty', async () => {
    setupMocks({ selectedOrgId: null })

    const { result } = renderHook(() => useGeneratorScope())

    await waitFor(() => {
      expect(result.current.availableGenerators).toHaveLength(0)
    })
  })

  it('admin can set scope to specific generator ID', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    mockDb
      .insert(generators)
      .values({
        id: 'gen-2',
        organizationId: IDS.org,
        title: 'Yamaha EF2000iS',
        model: 'EF2000iS',
        maxConsecutiveRunHours: 6,
        requiredRestHours: 3,
        runWarningThresholdPct: 80,
        createdAt: '2026-01-15T12:00:00Z'
      })
      .run()
    setupMocks()

    const { result } = renderHook(() => useGeneratorScope())

    await waitFor(() => {
      expect(result.current.availableGenerators).toHaveLength(2)
    })

    act(() => result.current.setGeneratorScope(IDS.generator))

    await waitFor(() => {
      expect(result.current.visibleGeneratorIds.size).toBe(1)
      expect(result.current.visibleGeneratorIds.has(IDS.generator)).toBe(true)
    })
  })

  it('admin can set scope to my to see only assigned generators', async () => {
    seedBaseScenario(mockDb)
    seedGenerator(mockDb)
    mockDb
      .insert(generators)
      .values({
        id: 'gen-2',
        organizationId: IDS.org,
        title: 'Yamaha EF2000iS',
        model: 'EF2000iS',
        maxConsecutiveRunHours: 6,
        requiredRestHours: 3,
        runWarningThresholdPct: 80,
        createdAt: '2026-01-15T12:00:00Z'
      })
      .run()
    mockDb
      .insert(generatorUserAssignments)
      .values({
        id: 'assign-admin',
        generatorId: IDS.generator,
        userId: IDS.adminUser,
        assignedAt: '2026-01-15T12:00:00Z'
      })
      .run()
    setupMocks()

    const { result } = renderHook(() => useGeneratorScope())

    await waitFor(() => {
      expect(result.current.availableGenerators).toHaveLength(2)
    })

    act(() => result.current.setGeneratorScope('my'))

    await waitFor(() => {
      expect(result.current.visibleGeneratorIds.size).toBe(1)
      expect(result.current.visibleGeneratorIds.has(IDS.generator)).toBe(true)
      expect(result.current.visibleGeneratorIds.has('gen-2')).toBe(false)
    })
  })
})
