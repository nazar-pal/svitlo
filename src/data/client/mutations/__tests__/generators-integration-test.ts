import { eq } from 'drizzle-orm'

import { generators } from '@/data/client/db-schema/generators'
import { maintenanceTemplates } from '@/data/client/db-schema/maintenance'

import { setupMutationHarness } from './harness'
import { IDS, seedBaseScenario, seedGenerator } from './seed'

const h = setupMutationHarness()
const { updateGenerator, createGeneratorWithMaintenance, deleteGenerator } =
  h.mutations.generators

beforeEach(() => {
  seedBaseScenario(h.db)
  seedGenerator(h.db)
})

// ── updateGenerator ──────────────────���──────────────────────────────────────

describe('updateGenerator', () => {
  it('admin updates generator fields', async () => {
    const result = await updateGenerator(IDS.adminUser, IDS.generator, {
      title: 'Updated Title',
      model: 'EU7000is'
    })
    expect(result.ok).toBe(true)

    const [gen] = h.db
      .select()
      .from(generators)
      .where(eq(generators.id, IDS.generator))
      .all()
    expect(gen.title).toBe('Updated Title')
    expect(gen.model).toBe('EU7000is')
  })

  // Behavior change: previously a missing row silently no-opped. The shared
  // lifecycle checks now return a structured `GENERATOR_NOT_FOUND` so the
  // UI can surface it. Authz/validation branches are covered by the shared
  // policy/checks unit tests; integration tests only assert the SQL write
  // (or absence of it) from here on.
  it('fails for nonexistent generator with GENERATOR_NOT_FOUND', async () => {
    const result = await updateGenerator(IDS.adminUser, 'nonexistent', {
      title: 'Test'
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('GENERATOR_NOT_FOUND')
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
    const gens = h.db
      .select()
      .from(generators)
      .where(eq(generators.title, 'New Gen'))
      .all()
    expect(gens).toHaveLength(1)

    // Both templates inserted
    const templates = h.db
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

    const gens = h.db
      .select()
      .from(generators)
      .where(eq(generators.title, 'Bare Gen'))
      .all()
    expect(gens).toHaveLength(1)
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
    const gens = h.db
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

    const [row] = h.db
      .select()
      .from(generators)
      .where(eq(generators.id, IDS.generator))
      .all()
    expect(row).toBeUndefined()
  })

  // Same behavior change as updateGenerator: missing rows now surface a
  // structured code instead of silently no-opping.
  it('fails for nonexistent generator with GENERATOR_NOT_FOUND', async () => {
    const result = await deleteGenerator(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('GENERATOR_NOT_FOUND')
  })
})
