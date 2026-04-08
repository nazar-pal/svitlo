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
jest.mock('@/lib/i18n', () => ({ t: (key: string) => key }))
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }))

import {
  updateGenerator,
  createGeneratorWithMaintenance,
  deleteGenerator
} from '../generators'

beforeEach(() => {
  resetDatabase()
  mockIdCounter = 0
  seedBaseScenario(mockTestDb.sqlite)
  seedGenerator(mockTestDb.sqlite)
})

afterAll(() => closeDatabase())

// ── updateGenerator ─────────────────────────────────────────────────────────

describe('updateGenerator', () => {
  it('admin updates generator fields', async () => {
    const result = await updateGenerator(IDS.adminUser, IDS.generator, {
      title: 'Updated Title',
      model: 'EU7000is'
    })
    expect(result.ok).toBe(true)

    const gen = mockTestDb.sqlite
      .prepare('SELECT * FROM generators WHERE id = ?')
      .get(IDS.generator) as { title: string; model: string }
    expect(gen.title).toBe('Updated Title')
    expect(gen.model).toBe('EU7000is')
  })

  it('fails when non-admin tries to update', async () => {
    const result = await updateGenerator(IDS.memberUser, IDS.generator, {
      title: 'Hacked'
    })
    expect(result.ok).toBe(false)
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

  it('fails when outsider tries to update', async () => {
    const result = await updateGenerator(IDS.outsiderUser, IDS.generator, {
      title: 'Hacked'
    })
    expect(result.ok).toBe(false)
  })
})

// ── createGeneratorWithMaintenance ──────────────────────────────────────────

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
    const gens = mockTestDb.sqlite
      .prepare('SELECT * FROM generators WHERE title = ?')
      .all('New Gen')
    expect(gens).toHaveLength(1)

    // Both templates inserted
    const generatorId = (gens[0] as { id: string }).id
    const templates = mockTestDb.sqlite
      .prepare('SELECT * FROM maintenance_templates WHERE generator_id = ?')
      .all(generatorId)
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

    const gens = mockTestDb.sqlite
      .prepare('SELECT * FROM generators WHERE title = ?')
      .all('Bare Gen')
    expect(gens).toHaveLength(1)
  })

  it('fails when non-admin tries to create', async () => {
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
    const gens = mockTestDb.sqlite
      .prepare('SELECT * FROM generators WHERE title = ?')
      .all('Good Gen')
    expect(gens).toHaveLength(0)
  })

  it('fails when outsider tries to create', async () => {
    const result = await createGeneratorWithMaintenance(
      IDS.outsiderUser,
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
    if (!result.ok) expect(result.error).toContain('Air Filter')
  })
})

// ── deleteGenerator ─────────────────────────────────────────────────────────

describe('deleteGenerator', () => {
  it('admin deletes a generator', async () => {
    const result = await deleteGenerator(IDS.adminUser, IDS.generator)
    expect(result.ok).toBe(true)

    const row = mockTestDb.sqlite
      .prepare('SELECT * FROM generators WHERE id = ?')
      .get(IDS.generator)
    expect(row).toBeUndefined()
  })

  it('fails when non-admin tries to delete', async () => {
    const result = await deleteGenerator(IDS.memberUser, IDS.generator)
    expect(result.ok).toBe(false)
  })

  it('fails for nonexistent generator', async () => {
    const result = await deleteGenerator(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })

  it('fails when outsider tries to delete', async () => {
    const result = await deleteGenerator(IDS.outsiderUser, IDS.generator)
    expect(result.ok).toBe(false)
  })
})
