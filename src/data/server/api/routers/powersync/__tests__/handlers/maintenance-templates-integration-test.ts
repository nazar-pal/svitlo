import { eq } from 'drizzle-orm'

import { maintenanceTemplates } from '@/data/server/db-schema'

import { handleMaintenanceTemplates } from '../../handlers/maintenance-templates'
import { IDS, seedTemplate } from '../seed-server'
import { setupServerHandlersFixture } from './fixture'

const fixture = setupServerHandlersFixture()

describe('handleMaintenanceTemplates', () => {
  it('insert: admin creates', async () => {
    const newId = crypto.randomUUID()
    const result = await handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        data: {
          generator_id: IDS.generator,
          task_name: 'Oil change',
          trigger_type: 'hours',
          trigger_hours_interval: '100',
          is_one_time: 0
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, newId)
    })
    expect(row!.taskName).toBe('Oil change')
  })

  it('update: admin updates', async () => {
    await seedTemplate(fixture.testDb.db)
    const result = await handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'update',
        id: IDS.template,
        data: { task_name: 'Updated Oil' }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, IDS.template)
    })
    expect(row!.taskName).toBe('Updated Oil')
  })

  it('rejects non-admin insert and creates no template', async () => {
    const newId = crypto.randomUUID()
    const result = await handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        userId: IDS.member,
        data: {
          generator_id: IDS.generator,
          task_name: 'Nope',
          trigger_type: 'hours',
          trigger_hours_interval: '100',
          is_one_time: 0
        }
      })
    )
    expect(result.ok).toBe(false)

    const row = await fixture.testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, newId)
    })
    expect(row).toBeUndefined()
  })

  it('rejects non-admin delete and leaves the template intact', async () => {
    await seedTemplate(fixture.testDb.db)
    const result = await handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.template,
        userId: IDS.member
      })
    )
    expect(result.ok).toBe(false)

    const row = await fixture.testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, IDS.template)
    })
    expect(row).toBeDefined()
  })

  it('update: template not found', async () => {
    const result = await handleMaintenanceTemplates(
      fixture.makeCtx({ op: 'update', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(false)
  })

  it('rejects non-admin update and leaves the template intact', async () => {
    await seedTemplate(fixture.testDb.db)
    const result = await handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'update',
        id: IDS.template,
        userId: IDS.member,
        data: { task_name: 'Hacked' }
      })
    )
    expect(result.ok).toBe(false)

    const row = await fixture.testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, IDS.template)
    })
    expect(row!.taskName).not.toBe('Hacked')
  })

  it('update: rejects empty data', async () => {
    await seedTemplate(fixture.testDb.db)
    const result = await handleMaintenanceTemplates(
      fixture.makeCtx({ op: 'update', id: IDS.template, data: {} })
    )
    expect(result.ok).toBe(false)
  })

  it('delete: admin deletes', async () => {
    await seedTemplate(fixture.testDb.db)
    const result = await handleMaintenanceTemplates(
      fixture.makeCtx({ op: 'delete', id: IDS.template })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, IDS.template)
    })
    expect(row).toBeUndefined()
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleMaintenanceTemplates(
      fixture.makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  // PG CHECK constraint: trigger_fields_match_type
  it('insert: PG rejects mismatched trigger fields via CHECK constraint', async () => {
    const newId = crypto.randomUUID()
    const result = handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        data: {
          generator_id: IDS.generator,
          task_name: 'Bad template',
          trigger_type: 'hours',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects empty task name via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: '  ',
          trigger_type: 'hours',
          trigger_hours_interval: '100',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects non-positive trigger_hours_interval via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: 'Oil change',
          trigger_type: 'hours',
          trigger_hours_interval: '0',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects calendar type missing calendar_days via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: 'Filter change',
          trigger_type: 'calendar',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects whichever_first missing hours_interval via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: 'Full service',
          trigger_type: 'whichever_first',
          trigger_calendar_days: '30',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects whichever_first missing calendar_days via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: 'Full service',
          trigger_type: 'whichever_first',
          trigger_hours_interval: '100',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects non-positive trigger_calendar_days via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      fixture.makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: 'Filter change',
          trigger_type: 'calendar',
          trigger_calendar_days: '0',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })
})
