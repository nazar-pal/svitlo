import { eq } from 'drizzle-orm'

import { generators } from '@/data/client/db-schema/generators'
import { maintenanceTemplates } from '@/data/client/db-schema/maintenance'

import { createTestDatabase, resetDatabase, closeDatabase } from './test-db'
import { IDS, seedBaseScenario, seedGenerator } from './seed'

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
  updateGenerator,
  createGeneratorWithMaintenance,
  deleteGenerator
} from '../generators'

beforeEach(() => {
  resetDatabase(mockTestDb.sqlite)
  mockIdCounter = 0
  seedBaseScenario(mockTestDb.db)
  seedGenerator(mockTestDb.db)
})

afterAll(() => closeDatabase(mockTestDb.sqlite))

// ── updateGenerator ──────────────────���──────────────────────────────────────

describe('updateGenerator', () => {
  it('admin updates generator fields', async () => {
    const result = await updateGenerator(IDS.adminUser, IDS.generator, {
      title: 'Updated Title',
      model: 'EU7000is'
    })
    expect(result.ok).toBe(true)

    const [gen] = mockTestDb.db
      .select()
      .from(generators)
      .where(eq(generators.id, IDS.generator))
      .all()
    expect(gen.title).toBe('Updated Title')
    expect(gen.model).toBe('EU7000is')
  })

  it('rejects non-admin and leaves the generator intact', async () => {
    const result = await updateGenerator(IDS.memberUser, IDS.generator, {
      title: 'Hacked'
    })
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.error.code).toBe('ONLY_ADMIN_CAN_UPDATE_GENERATORS')

    const [gen] = mockTestDb.db
      .select()
      .from(generators)
      .where(eq(generators.id, IDS.generator))
      .all()
    expect(gen.title).not.toBe('Hacked')
  })

  it('fails with empty input', async () => {
    const result = await updateGenerator(IDS.adminUser, IDS.generator, {})
    expect(result.ok).toBe(false)
  })

  it('fails for nonexistent generator', async () => {
    const result = await updateGenerator(IDS.adminUser, 'nonexistent', {
      title: 'Test'
    })
    expect(result.ok).toBe(false)
  })
})

// ── createGeneratorWithMaintenance ───────���──────────────────────────────────

describe('createGeneratorWithMaintenance', () => {
  it('admin creates generator with maintenance templates', async () => {
    const result = await createGeneratorWithMaintenance(
      IDS.adminUser,
      {
        organizationId: IDS.org,
        title: 'New Gen',
        model: 'Yamaha EF2000iS',
        maxConsecutiveRunHours: 10,
        requiredRestHours: 2,
        runWarningThresholdPct: 80
      },
      [
        {
          taskName: 'Oil Change',
          triggerType: 'hours',
          triggerHoursInterval: 100
        },
        {
          taskName: 'Air Filter',
          triggerType: 'calendar',
          triggerCalendarDays: 90
        }
      ]
    )
    expect(result.ok).toBe(true)

    // Generator inserted
    const gens = mockTestDb.db
      .select()
      .from(generators)
      .where(eq(generators.title, 'New Gen'))
      .all()
    expect(gens).toHaveLength(1)

    // Both templates inserted
    const templates = mockTestDb.db
      .select()
      .from(maintenanceTemplates)
      .where(eq(maintenanceTemplates.generatorId, gens[0].id))
      .all()
    expect(templates).toHaveLength(2)
  })

  it('admin creates generator with no maintenance templates', async () => {
    const result = await createGeneratorWithMaintenance(
      IDS.adminUser,
      {
        organizationId: IDS.org,
        title: 'Bare Gen',
        model: 'Honda EU3000iS',
        maxConsecutiveRunHours: 8,
        requiredRestHours: 4,
        runWarningThresholdPct: 80
      },
      []
    )
    expect(result.ok).toBe(true)

    const gens = mockTestDb.db
      .select()
      .from(generators)
      .where(eq(generators.title, 'Bare Gen'))
      .all()
    expect(gens).toHaveLength(1)
  })

  it('rejects non-admin and creates no generator', async () => {
    const result = await createGeneratorWithMaintenance(
      IDS.memberUser,
      {
        organizationId: IDS.org,
        title: 'Nope',
        model: 'Test',
        maxConsecutiveRunHours: 8,
        requiredRestHours: 4,
        runWarningThresholdPct: 80
      },
      []
    )
    expect(result.ok).toBe(false)

    const gens = mockTestDb.db
      .select()
      .from(generators)
      .where(eq(generators.title, 'Nope'))
      .all()
    expect(gens).toHaveLength(0)
  })

  it('fails with invalid generator input', async () => {
    const result = await createGeneratorWithMaintenance(
      IDS.adminUser,
      {
        organizationId: IDS.org,
        title: '',
        model: 'Test',
        maxConsecutiveRunHours: 8,
        requiredRestHours: 4,
        runWarningThresholdPct: 80
      },
      []
    )
    expect(result.ok).toBe(false)
  })

  it('fails with invalid maintenance template input', async () => {
    const result = await createGeneratorWithMaintenance(
      IDS.adminUser,
      {
        organizationId: IDS.org,
        title: 'Good Gen',
        model: 'Test',
        maxConsecutiveRunHours: 8,
        requiredRestHours: 4,
        runWarningThresholdPct: 80
      },
      [
        {
          taskName: 'Oil Change',
          triggerType: 'hours'
          // missing triggerHoursInterval
        }
      ]
    )
    expect(result.ok).toBe(false)

    // Generator should NOT have been created (validation before transaction)
    const gens = mockTestDb.db
      .select()
      .from(generators)
      .where(eq(generators.title, 'Good Gen'))
      .all()
    expect(gens).toHaveLength(0)
  })

  it('includes template taskName in validation error', async () => {
    const result = await createGeneratorWithMaintenance(
      IDS.adminUser,
      {
        organizationId: IDS.org,
        title: 'Good Gen',
        model: 'Test',
        maxConsecutiveRunHours: 8,
        requiredRestHours: 4,
        runWarningThresholdPct: 80
      },
      [
        {
          taskName: 'Air Filter',
          triggerType: 'hours'
          // missing triggerHoursInterval
        }
      ]
    )
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect(result.error).toEqual({
        code: 'MAINTENANCE_TASK_VALIDATION_FAILED',
        params: { taskName: 'Air Filter' }
      })
  })
})

// ── deleteGenerator ─────────────────────────────────────────────────────────

describe('deleteGenerator', () => {
  it('admin deletes a generator', async () => {
    const result = await deleteGenerator(IDS.adminUser, IDS.generator)
    expect(result.ok).toBe(true)

    const [row] = mockTestDb.db
      .select()
      .from(generators)
      .where(eq(generators.id, IDS.generator))
      .all()
    expect(row).toBeUndefined()
  })

  it('rejects non-admin and leaves the generator intact', async () => {
    const result = await deleteGenerator(IDS.memberUser, IDS.generator)
    expect(result.ok).toBe(false)

    const [row] = mockTestDb.db
      .select()
      .from(generators)
      .where(eq(generators.id, IDS.generator))
      .all()
    expect(row).toBeDefined()
  })

  it('fails for nonexistent generator', async () => {
    const result = await deleteGenerator(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })
})
