import { eq } from 'drizzle-orm'

import { maintenanceRecords } from '@/data/server/db-schema'
import { serverLookup } from '@/data/server/registry'
import * as authz from '@/data/shared/authz/decisions'
import { runDecisionAsync } from '@/data/shared/facts/async-adapter'
import type { RecordRef } from '@/data/shared/maintenance'

import { replayShieldNotFound } from './replay'
import { transformSyncRow } from '../transform'
import { fail, ok, type Insert, type TableHandler } from './types'

export const handleMaintenanceRecords: TableHandler = async ctx => {
  const { db, userId, op, id, data } = ctx
  const checks = ctx.checks.maintenance

  if (op === 'insert') {
    const values = transformSyncRow(maintenanceRecords, data)
    const generatorId = values.generatorId as string
    const templateId = values.templateId as string

    const result = await checks.recordMaintenance({
      userId,
      generatorId,
      templateId
    })
    if (!result.ok) return fail(result.code)

    await db
      .insert(maintenanceRecords)
      .values({
        ...values,
        id,
        performedByUserId: userId
      } as Insert<typeof maintenanceRecords>)
      .onConflictDoNothing()
    return ok
  }

  if (op === 'delete') {
    const shielded = replayShieldNotFound(
      await checks.deleteRecord({ userId, recordId: id }),
      'RECORD_NOT_FOUND'
    )
    if (shielded.status === 'consume') return shielded.result

    // Server-only extra: non-admins may only delete their own records. The
    // shared policy allows any user with generator access, matching client
    // behaviour; the server layers an ownership rule on top as defence in
    // depth for the sync protocol. Reuse the record the policy already
    // fetched — no second `findRecord` round trip. Same pattern as the
    // session delete handler.
    const record = shielded.data.facts.record
    if (!record) return fail('RECORD_NOT_FOUND')
    const adminCheck = await runDecisionAsync(
      authz.isGeneratorOrgAdmin,
      { userId, generatorId: record.generatorId },
      serverLookup(db)
    )
    const isAdmin = adminCheck.ok
    if (!isAdmin && record.performedByUserId !== userId)
      return fail('Can only delete your own maintenance records')

    await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, id))
    return ok
  }

  if (op === 'update') {
    // Two wire shapes reach this branch:
    //   notes-only edit  → { notes }
    //   performedAt edit → { performed_at, notes? } from EditMaintenanceScreen
    // `performed_at` presence picks the richer rule (`updateRecord` enforces
    // the future-date check); plain notes edits keep using `deleteRecord`,
    // whose policy is the exact "row exists + caller has access" gate we
    // need without dragging an irrelevant `performedAt` arg through.
    const fields: Partial<Insert<typeof maintenanceRecords>> = {}
    if ('notes' in data)
      fields.notes = data.notes == null ? null : String(data.notes)

    let record: RecordRef | null
    if ('performed_at' in data) {
      const performedAt = data.performed_at as string
      const result = await checks.updateRecord({
        userId,
        recordId: id,
        performedAt,
        now: ctx.now()
      })
      if (!result.ok) {
        if (result.code === 'RECORD_NOT_FOUND') return fail('Record not found')
        return fail(result.code)
      }
      record = result.facts.record
      fields.performedAt = new Date(performedAt)
    } else {
      const result = await checks.deleteRecord({ userId, recordId: id })
      if (!result.ok) {
        if (result.code === 'RECORD_NOT_FOUND') return fail('Record not found')
        return fail(result.code)
      }
      record = result.facts.record
    }

    // Mirror the delete branch's defence-in-depth: non-admins may only edit
    // their own records. Reuse the record the policy already fetched.
    if (!record) return fail('Record not found')
    const adminCheck = await runDecisionAsync(
      authz.isGeneratorOrgAdmin,
      { userId, generatorId: record.generatorId },
      serverLookup(db)
    )
    const isAdmin = adminCheck.ok
    if (!isAdmin && record.performedByUserId !== userId)
      return fail('Can only edit your own maintenance records')

    if (Object.keys(fields).length > 0)
      await db
        .update(maintenanceRecords)
        .set(fields)
        .where(eq(maintenanceRecords.id, id))

    return ok
  }

  return fail('Invalid operation on maintenance_records')
}
