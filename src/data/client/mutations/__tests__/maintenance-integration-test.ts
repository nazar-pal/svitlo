import { eq } from 'drizzle-orm'

import { generators } from '@/data/client/db-schema/generators'
import {
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/client/db-schema/maintenance'

import { setupMutationHarness } from './harness'
import {
  IDS,
  seedBaseScenario,
  seedGenerator,
  seedAssignment,
  seedMaintenanceTemplate,
  seedMaintenanceRecord
} from './seed'

const h = setupMutationHarness()

import {
  createMaintenanceTemplate,
  updateMaintenanceTemplate,
  deleteMaintenanceTemplate,
  deleteMaintenanceRecord,
  updateMaintenanceRecord,
  recordMaintenance
} from '../maintenance'

beforeEach(() => {
  seedBaseScenario(h.db)
  seedGenerator(h.db)
})

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

    const rows = h.db
      .select()
      .from(maintenanceTemplates)
      .where(eq(maintenanceTemplates.generatorId, IDS.generator))
      .all()
    expect(rows).toHaveLength(1)
    expect(rows[0].taskName).toBe('Oil Change')
    expect(rows[0].triggerType).toBe('hours')
    expect(rows[0].triggerHoursInterval).toBe(100)
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

  it('rejects non-admin and creates no template', async () => {
    const result = await createMaintenanceTemplate(IDS.memberUser, {
      generatorId: IDS.generator,
      taskName: 'Nope',
      triggerType: 'hours',
      triggerHoursInterval: 100
    })
    expect(result.ok).toBe(false)

    const rows = h.db
      .select()
      .from(maintenanceTemplates)
      .where(eq(maintenanceTemplates.generatorId, IDS.generator))
      .all()
    expect(rows).toHaveLength(0)
  })
})

// ── updateMaintenanceTemplate ───────────────────────────────────────────────

describe('updateMaintenanceTemplate', () => {
  beforeEach(() => {
    seedMaintenanceTemplate(h.db)
  })

  it('admin updates template fields', async () => {
    const result = await updateMaintenanceTemplate(
      IDS.adminUser,
      IDS.template,
      { taskName: 'Updated Task' }
    )
    expect(result.ok).toBe(true)

    const [template] = h.db
      .select()
      .from(maintenanceTemplates)
      .where(eq(maintenanceTemplates.id, IDS.template))
      .all()
    expect(template.taskName).toBe('Updated Task')
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

  it('rejects non-admin and leaves the template intact', async () => {
    const result = await updateMaintenanceTemplate(
      IDS.memberUser,
      IDS.template,
      { taskName: 'Hacked' }
    )
    expect(result.ok).toBe(false)

    const [template] = h.db
      .select()
      .from(maintenanceTemplates)
      .where(eq(maintenanceTemplates.id, IDS.template))
      .all()
    expect(template.taskName).not.toBe('Hacked')
  })
})

// ── deleteMaintenanceTemplate ───────────────────────────────────────────────

describe('deleteMaintenanceTemplate', () => {
  beforeEach(() => {
    seedMaintenanceTemplate(h.db)
  })

  it('admin deletes a template', async () => {
    const result = await deleteMaintenanceTemplate(IDS.adminUser, IDS.template)
    expect(result.ok).toBe(true)

    const [row] = h.db
      .select()
      .from(maintenanceTemplates)
      .where(eq(maintenanceTemplates.id, IDS.template))
      .all()
    expect(row).toBeUndefined()
  })

  it('rejects non-admin and leaves the template intact', async () => {
    const result = await deleteMaintenanceTemplate(IDS.memberUser, IDS.template)
    expect(result.ok).toBe(false)

    const [row] = h.db
      .select()
      .from(maintenanceTemplates)
      .where(eq(maintenanceTemplates.id, IDS.template))
      .all()
    expect(row).toBeDefined()
  })

  it('fails for nonexistent template', async () => {
    const result = await deleteMaintenanceTemplate(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })
})

// ── recordMaintenance ───────────────────────────────────────────────────────

describe('recordMaintenance', () => {
  beforeEach(() => {
    seedMaintenanceTemplate(h.db)
  })

  it('admin records maintenance', async () => {
    const result = await recordMaintenance(IDS.adminUser, {
      templateId: IDS.template,
      generatorId: IDS.generator
    })
    expect(result.ok).toBe(true)

    const rows = h.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.templateId, IDS.template))
      .all()
    expect(rows).toHaveLength(1)
    expect(rows[0].performedByUserId).toBe(IDS.adminUser)
  })

  it('assigned member records maintenance', async () => {
    seedAssignment(h.db)
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

    const [record] = h.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.templateId, IDS.template))
      .all()
    expect(record.performedAt).toBe('2026-01-15T12:00:00Z')
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
    h.db
      .insert(generators)
      .values({
        id: 'gen-2',
        organizationId: IDS.org,
        title: 'Other Gen',
        model: 'Model',
        maxConsecutiveRunHours: 8,
        requiredRestHours: 4,
        runWarningThresholdPct: 80,
        createdAt: '2026-01-15T12:00:00Z'
      })
      .run()
    h.db
      .insert(maintenanceTemplates)
      .values({
        id: 'tmpl-2',
        generatorId: 'gen-2',
        taskName: 'Other Task',
        triggerType: 'hours',
        triggerHoursInterval: 50,
        isOneTime: 0,
        createdAt: '2026-01-15T12:00:00Z'
      })
      .run()

    const result = await recordMaintenance(IDS.adminUser, {
      templateId: 'tmpl-2',
      generatorId: IDS.generator // wrong generator for tmpl-2
    })
    expect(result.ok).toBe(false)
  })

  it('rejects outsider and creates no record', async () => {
    const result = await recordMaintenance(IDS.outsiderUser, {
      templateId: IDS.template,
      generatorId: IDS.generator
    })
    expect(result.ok).toBe(false)

    const rows = h.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.generatorId, IDS.generator))
      .all()
    expect(rows).toHaveLength(0)
  })
})

// ── deleteMaintenanceRecord ─────────────────────────────────────────────────

describe('deleteMaintenanceRecord', () => {
  beforeEach(() => {
    seedMaintenanceTemplate(h.db)
    seedMaintenanceRecord(h.db)
  })

  it('admin deletes a record', async () => {
    const result = await deleteMaintenanceRecord(IDS.adminUser, IDS.record)
    expect(result.ok).toBe(true)

    const [row] = h.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.id, IDS.record))
      .all()
    expect(row).toBeUndefined()
  })

  it('assigned member deletes a record', async () => {
    seedAssignment(h.db)
    const result = await deleteMaintenanceRecord(IDS.memberUser, IDS.record)
    expect(result.ok).toBe(true)
  })

  it('rejects outsider and leaves the record intact', async () => {
    const result = await deleteMaintenanceRecord(IDS.outsiderUser, IDS.record)
    expect(result.ok).toBe(false)

    const [row] = h.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.id, IDS.record))
      .all()
    expect(row).toBeDefined()
  })

  it('fails for nonexistent record', async () => {
    const result = await deleteMaintenanceRecord(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })
})

// ── updateMaintenanceRecord ─────────────────────────────────────────────────

describe('updateMaintenanceRecord', () => {
  beforeEach(() => {
    seedMaintenanceTemplate(h.db)
    seedMaintenanceRecord(h.db)
  })

  it('admin updates a record', async () => {
    const result = await updateMaintenanceRecord(IDS.adminUser, IDS.record, {
      performedAt: '2026-01-10T08:00:00Z',
      notes: 'Changed oil and filter'
    })
    expect(result.ok).toBe(true)

    const [record] = h.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.id, IDS.record))
      .all()
    expect(record.performedAt).toBe('2026-01-10T08:00:00Z')
    expect(record.notes).toBe('Changed oil and filter')
  })

  it('assigned member updates a record', async () => {
    seedAssignment(h.db)
    const result = await updateMaintenanceRecord(IDS.memberUser, IDS.record, {
      performedAt: '2026-01-10T08:00:00Z',
      notes: null
    })
    expect(result.ok).toBe(true)
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

  it('rejects outsider and leaves the record intact', async () => {
    const result = await updateMaintenanceRecord(IDS.outsiderUser, IDS.record, {
      performedAt: '2026-01-10T08:00:00Z',
      notes: 'Hacked'
    })
    expect(result.ok).toBe(false)

    const [record] = h.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.id, IDS.record))
      .all()
    expect(record.notes).not.toBe('Hacked')
  })
})
