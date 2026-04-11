import { eq } from 'drizzle-orm'

import { maintenanceRecords } from '@/data/server/db-schema'

import { handleMaintenanceRecords } from '../../handlers/maintenance-records'
import { IDS, seedAssignment, seedRecord, seedTemplate } from '../seed-server'
import { setupServerHandlersFixture } from './fixture'

const fixture = setupServerHandlersFixture()

describe('handleMaintenanceRecords', () => {
  beforeEach(async () => {
    await seedTemplate(fixture.testDb.db)
  })

  // SECURITY: performedByUserId forced to caller
  it('insert: forces performedByUserId to caller', async () => {
    const newId = crypto.randomUUID()
    const result = await handleMaintenanceRecords(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        data: {
          template_id: IDS.template,
          generator_id: IDS.generator,
          performed_by_user_id: IDS.outsider
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, newId)
    })
    expect(row!.performedByUserId).toBe(IDS.admin)
  })

  it('rejects outsider insert and creates no record', async () => {
    const result = await handleMaintenanceRecords(
      fixture.makeCtx({
        op: 'insert',
        userId: IDS.outsider,
        data: {
          template_id: IDS.template,
          generator_id: IDS.generator
        }
      })
    )
    expect(result.ok).toBe(false)

    const rows = await fixture.testDb.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.generatorId, IDS.generator))
    expect(rows).toHaveLength(0)
  })

  it('update: record found, has access', async () => {
    await seedRecord(fixture.testDb.db)
    const result = await handleMaintenanceRecords(
      fixture.makeCtx({
        op: 'update',
        id: IDS.record,
        data: { notes: 'test note' }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row!.notes).toBe('test note')
  })

  it('update: record not found', async () => {
    const result = await handleMaintenanceRecords(
      fixture.makeCtx({ op: 'update', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(false)
  })

  // SECURITY: only notes is updatable
  it('update: only notes is updatable, other fields dropped', async () => {
    await seedRecord(fixture.testDb.db)
    const result = await handleMaintenanceRecords(
      fixture.makeCtx({
        op: 'update',
        id: IDS.record,
        data: {
          notes: 'legit note',
          generator_id: crypto.randomUUID(),
          performed_by_user_id: IDS.outsider
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row!.notes).toBe('legit note')
    expect(row!.generatorId).toBe(IDS.generator)
    expect(row!.performedByUserId).toBe(IDS.admin)
  })

  it('update: notes null', async () => {
    await seedRecord(fixture.testDb.db)
    await handleMaintenanceRecords(
      fixture.makeCtx({
        op: 'update',
        id: IDS.record,
        data: { notes: 'something' }
      })
    )
    await handleMaintenanceRecords(
      fixture.makeCtx({ op: 'update', id: IDS.record, data: { notes: null } })
    )
    const row = await fixture.testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row!.notes).toBeNull()
  })

  it('update: notes non-string coerced via String()', async () => {
    await seedRecord(fixture.testDb.db)
    await handleMaintenanceRecords(
      fixture.makeCtx({
        op: 'update',
        id: IDS.record,
        data: { notes: 123 }
      })
    )
    const row = await fixture.testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row!.notes).toBe('123')
  })

  it('rejects outsider update and leaves the record intact', async () => {
    await seedRecord(fixture.testDb.db)
    const result = await handleMaintenanceRecords(
      fixture.makeCtx({
        op: 'update',
        id: IDS.record,
        userId: IDS.outsider,
        data: { notes: 'Hacked' }
      })
    )
    expect(result.ok).toBe(false)

    const row = await fixture.testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row!.notes).not.toBe('Hacked')
  })

  it('rejects outsider delete and leaves the record intact', async () => {
    await seedRecord(fixture.testDb.db)
    const result = await handleMaintenanceRecords(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.record,
        userId: IDS.outsider
      })
    )
    expect(result.ok).toBe(false)

    const row = await fixture.testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row).toBeDefined()
  })

  it("delete: admin can delete anyone's record", async () => {
    await seedRecord(fixture.testDb.db, IDS.member)
    const result = await handleMaintenanceRecords(
      fixture.makeCtx({ op: 'delete', id: IDS.record })
    )
    expect(result.ok).toBe(true)
  })

  it('delete: non-admin can delete own record', async () => {
    await seedRecord(fixture.testDb.db, IDS.member)
    await seedAssignment(fixture.testDb.db)
    const result = await handleMaintenanceRecords(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.record,
        userId: IDS.member
      })
    )
    expect(result.ok).toBe(true)
  })

  it("delete: non-admin cannot delete other's record", async () => {
    await seedRecord(fixture.testDb.db, IDS.admin)
    await seedAssignment(fixture.testDb.db)
    const result = await handleMaintenanceRecords(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.record,
        userId: IDS.member
      })
    )
    expect(result.ok).toBe(false)
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleMaintenanceRecords(
      fixture.makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })
})
