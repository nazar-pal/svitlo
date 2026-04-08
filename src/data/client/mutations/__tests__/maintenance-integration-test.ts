import { createTestDatabase, resetDatabase, closeDatabase } from './test-db'
import {
  IDS,
  seedBaseScenario,
  seedGenerator,
  seedAssignment,
  seedMaintenanceTemplate,
  seedMaintenanceRecord
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
  createMaintenanceTemplate,
  updateMaintenanceTemplate,
  deleteMaintenanceTemplate,
  deleteMaintenanceRecord,
  updateMaintenanceRecord,
  recordMaintenance
} from '../maintenance'

beforeEach(() => {
  resetDatabase()
  mockIdCounter = 0
  seedBaseScenario(mockTestDb.db)
  seedGenerator(mockTestDb.db)
})

afterAll(() => closeDatabase())

// ── createMaintenanceTemplate ───────────────────────────────────────────────

describe('createMaintenanceTemplate', () => {
  it('admin creates a hours-based template', async () => {
    const result = await createMaintenanceTemplate(IDS.adminUser, {
      generatorId: IDS.generator,
      taskName: 'Oil Change',
      triggerType: 'hours',
      triggerHoursInterval: 100
    })
    expect(result.ok).toBe(true)

    const rows = mockTestDb.sqlite
      .prepare('SELECT * FROM maintenance_templates WHERE generator_id = ?')
      .all(IDS.generator) as {
      task_name: string
      trigger_type: string
      trigger_hours_interval: number
    }[]
    expect(rows).toHaveLength(1)
    expect(rows[0].task_name).toBe('Oil Change')
    expect(rows[0].trigger_type).toBe('hours')
    expect(rows[0].trigger_hours_interval).toBe(100)
  })

  it('admin creates a calendar-based template', async () => {
    const result = await createMaintenanceTemplate(IDS.adminUser, {
      generatorId: IDS.generator,
      taskName: 'Annual Inspection',
      triggerType: 'calendar',
      triggerCalendarDays: 365
    })
    expect(result.ok).toBe(true)
  })

  it('admin creates a whichever_first template', async () => {
    const result = await createMaintenanceTemplate(IDS.adminUser, {
      generatorId: IDS.generator,
      taskName: 'Full Service',
      triggerType: 'whichever_first',
      triggerHoursInterval: 200,
      triggerCalendarDays: 180
    })
    expect(result.ok).toBe(true)
  })

  it('fails when non-admin tries to create', async () => {
    const result = await createMaintenanceTemplate(IDS.memberUser, {
      generatorId: IDS.generator,
      taskName: 'Test',
      triggerType: 'hours',
      triggerHoursInterval: 100
    })
    expect(result.ok).toBe(false)
  })

  it('fails with hours type but missing triggerHoursInterval', async () => {
    const result = await createMaintenanceTemplate(IDS.adminUser, {
      generatorId: IDS.generator,
      taskName: 'Bad Template',
      triggerType: 'hours'
    })
    expect(result.ok).toBe(false)
  })

  it('fails with empty task name', async () => {
    const result = await createMaintenanceTemplate(IDS.adminUser, {
      generatorId: IDS.generator,
      taskName: '',
      triggerType: 'hours',
      triggerHoursInterval: 100
    })
    expect(result.ok).toBe(false)
  })
})

// ── updateMaintenanceTemplate ───────────────────────────────────────────────

describe('updateMaintenanceTemplate', () => {
  beforeEach(() => {
    seedMaintenanceTemplate(mockTestDb.db)
  })

  it('admin updates template fields', async () => {
    const result = await updateMaintenanceTemplate(
      IDS.adminUser,
      IDS.template,
      { taskName: 'Updated Task' }
    )
    expect(result.ok).toBe(true)

    const template = mockTestDb.sqlite
      .prepare('SELECT * FROM maintenance_templates WHERE id = ?')
      .get(IDS.template) as { task_name: string }
    expect(template.task_name).toBe('Updated Task')
  })

  it('fails when non-admin tries to update', async () => {
    const result = await updateMaintenanceTemplate(
      IDS.memberUser,
      IDS.template,
      { taskName: 'Hacked' }
    )
    expect(result.ok).toBe(false)
  })

  it('fails for nonexistent template', async () => {
    const result = await updateMaintenanceTemplate(
      IDS.adminUser,
      'nonexistent',
      { taskName: 'Test' }
    )
    expect(result.ok).toBe(false)
  })

  it('fails with empty input', async () => {
    const result = await updateMaintenanceTemplate(
      IDS.adminUser,
      IDS.template,
      {}
    )
    expect(result.ok).toBe(false)
  })

  it('allows changing triggerType when companion fields already exist', async () => {
    // Template currently has triggerType='hours', triggerHoursInterval=100
    // Change to whichever_first, provide triggerCalendarDays
    const result = await updateMaintenanceTemplate(
      IDS.adminUser,
      IDS.template,
      {
        triggerType: 'whichever_first',
        triggerCalendarDays: 90
      }
    )
    expect(result.ok).toBe(true)
  })

  it('fails when changing triggerType without required companion field', async () => {
    // Template currently has triggerType='hours', triggerHoursInterval=100, triggerCalendarDays=NULL
    // Change to 'calendar' without providing triggerCalendarDays
    const result = await updateMaintenanceTemplate(
      IDS.adminUser,
      IDS.template,
      { triggerType: 'calendar' }
    )
    expect(result.ok).toBe(false)
  })
})

// ── deleteMaintenanceTemplate ───────────────────────────────────────────────

describe('deleteMaintenanceTemplate', () => {
  beforeEach(() => {
    seedMaintenanceTemplate(mockTestDb.db)
  })

  it('admin deletes a template', async () => {
    const result = await deleteMaintenanceTemplate(IDS.adminUser, IDS.template)
    expect(result.ok).toBe(true)

    const row = mockTestDb.sqlite
      .prepare('SELECT * FROM maintenance_templates WHERE id = ?')
      .get(IDS.template)
    expect(row).toBeUndefined()
  })

  it('fails when non-admin tries to delete', async () => {
    const result = await deleteMaintenanceTemplate(IDS.memberUser, IDS.template)
    expect(result.ok).toBe(false)
  })

  it('fails for nonexistent template', async () => {
    const result = await deleteMaintenanceTemplate(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })
})

// ── recordMaintenance ───────────────────────────────────────────────────────

describe('recordMaintenance', () => {
  beforeEach(() => {
    seedMaintenanceTemplate(mockTestDb.db)
  })

  it('admin records maintenance', async () => {
    const result = await recordMaintenance(IDS.adminUser, {
      templateId: IDS.template,
      generatorId: IDS.generator
    })
    expect(result.ok).toBe(true)

    const rows = mockTestDb.sqlite
      .prepare('SELECT * FROM maintenance_records WHERE template_id = ?')
      .all(IDS.template) as { performed_by_user_id: string }[]
    expect(rows).toHaveLength(1)
    expect(rows[0].performed_by_user_id).toBe(IDS.adminUser)
  })

  it('assigned member records maintenance', async () => {
    seedAssignment(mockTestDb.db)
    const result = await recordMaintenance(IDS.memberUser, {
      templateId: IDS.template,
      generatorId: IDS.generator
    })
    expect(result.ok).toBe(true)
  })

  it('records with explicit performedAt date', async () => {
    const result = await recordMaintenance(IDS.adminUser, {
      templateId: IDS.template,
      generatorId: IDS.generator,
      performedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(true)

    const record = mockTestDb.sqlite
      .prepare('SELECT * FROM maintenance_records WHERE template_id = ?')
      .get(IDS.template) as { performed_at: string }
    expect(record.performed_at).toBe('2026-01-15T12:00:00Z')
  })

  it('fails when outsider tries to record', async () => {
    const result = await recordMaintenance(IDS.outsiderUser, {
      templateId: IDS.template,
      generatorId: IDS.generator
    })
    expect(result.ok).toBe(false)
  })

  it('fails when template does not exist', async () => {
    const result = await recordMaintenance(IDS.adminUser, {
      templateId: 'nonexistent',
      generatorId: IDS.generator
    })
    expect(result.ok).toBe(false)
  })

  it('fails when template does not belong to generator', async () => {
    // Create a second generator with its own template
    mockTestDb.sqlite.exec(`
      INSERT INTO generators VALUES ('gen-2', '${IDS.org}', 'Other Gen', 'Model', NULL, 8, 4, 80, '2026-01-15T12:00:00Z');
      INSERT INTO maintenance_templates VALUES ('tmpl-2', 'gen-2', 'Other Task', NULL, 'hours', 50, NULL, 0, '2026-01-15T12:00:00Z');
    `)

    const result = await recordMaintenance(IDS.adminUser, {
      templateId: 'tmpl-2',
      generatorId: IDS.generator // wrong generator for tmpl-2
    })
    expect(result.ok).toBe(false)
  })
})

// ── deleteMaintenanceRecord ─────────────────────────────────────────────────

describe('deleteMaintenanceRecord', () => {
  beforeEach(() => {
    seedMaintenanceTemplate(mockTestDb.db)
    seedMaintenanceRecord(mockTestDb.db)
  })

  it('admin deletes a record', async () => {
    const result = await deleteMaintenanceRecord(IDS.adminUser, IDS.record)
    expect(result.ok).toBe(true)

    const row = mockTestDb.sqlite
      .prepare('SELECT * FROM maintenance_records WHERE id = ?')
      .get(IDS.record)
    expect(row).toBeUndefined()
  })

  it('assigned member deletes a record', async () => {
    seedAssignment(mockTestDb.db)
    const result = await deleteMaintenanceRecord(IDS.memberUser, IDS.record)
    expect(result.ok).toBe(true)
  })

  it('fails when outsider tries to delete', async () => {
    const result = await deleteMaintenanceRecord(IDS.outsiderUser, IDS.record)
    expect(result.ok).toBe(false)
  })

  it('fails for nonexistent record', async () => {
    const result = await deleteMaintenanceRecord(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })
})

// ── updateMaintenanceRecord ─────────────────────────────────────────────────

describe('updateMaintenanceRecord', () => {
  beforeEach(() => {
    seedMaintenanceTemplate(mockTestDb.db)
    seedMaintenanceRecord(mockTestDb.db)
  })

  it('admin updates a record', async () => {
    const result = await updateMaintenanceRecord(IDS.adminUser, IDS.record, {
      performedAt: '2026-01-10T08:00:00Z',
      notes: 'Changed oil and filter'
    })
    expect(result.ok).toBe(true)

    const record = mockTestDb.sqlite
      .prepare('SELECT * FROM maintenance_records WHERE id = ?')
      .get(IDS.record) as { performed_at: string; notes: string }
    expect(record.performed_at).toBe('2026-01-10T08:00:00Z')
    expect(record.notes).toBe('Changed oil and filter')
  })

  it('assigned member updates a record', async () => {
    seedAssignment(mockTestDb.db)
    const result = await updateMaintenanceRecord(IDS.memberUser, IDS.record, {
      performedAt: '2026-01-10T08:00:00Z',
      notes: null
    })
    expect(result.ok).toBe(true)
  })

  it('fails when outsider tries to update', async () => {
    const result = await updateMaintenanceRecord(IDS.outsiderUser, IDS.record, {
      performedAt: '2026-01-10T08:00:00Z',
      notes: null
    })
    expect(result.ok).toBe(false)
  })

  it('fails for nonexistent record', async () => {
    const result = await updateMaintenanceRecord(IDS.adminUser, 'nonexistent', {
      performedAt: '2026-01-10T08:00:00Z',
      notes: null
    })
    expect(result.ok).toBe(false)
  })

  it('fails when performedAt is in the future', async () => {
    const result = await updateMaintenanceRecord(IDS.adminUser, IDS.record, {
      performedAt: '2099-01-01T00:00:00Z',
      notes: null
    })
    expect(result.ok).toBe(false)
  })
})
