import { eq } from 'drizzle-orm'

import { maintenanceRecords } from '@/data/server/db-schema'
import type * as authzPolicy from '@/data/shared/authz/policy'
import type { RecordRef } from '@/data/shared/maintenance'

import { isOwnerOrGeneratorAdmin } from './checks'
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

    const record = shielded.data.facts.record
    if (!record) return fail('RECORD_NOT_FOUND')
    const allowed = isOwnerOrGeneratorAdmin(
      userId,
      record.performedByUserId,
      shielded.data.facts.authzGenerator
    )
    if (!allowed) return fail('Can only delete your own maintenance records')

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

    // Both branches hand back the same fact bundle, kept whole so the
    // `record` fed to the owner check and the `authzGenerator` backing its
    // admin fallback provably come from the same decision result.
    let facts: {
      record: RecordRef | null
      authzGenerator?: authzPolicy.GeneratorAuthzFact | null
    }
    if ('performed_at' in data) {
      // Untrusted wire data: an unparseable date would sail through the
      // future-date policy check (`NaN > now` is false) and only blow up as
      // a Drizzle serialization error. Reject it up front instead.
      const performedAt = data.performed_at
      if (
        typeof performedAt !== 'string' ||
        Number.isNaN(Date.parse(performedAt))
      )
        return fail('Invalid performed_at')
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
      facts = result.facts
      fields.performedAt = new Date(performedAt)
    } else {
      const result = await checks.deleteRecord({ userId, recordId: id })
      if (!result.ok) {
        if (result.code === 'RECORD_NOT_FOUND') return fail('Record not found')
        return fail(result.code)
      }
      facts = result.facts
    }

    if (!facts.record) return fail('Record not found')
    const allowed = isOwnerOrGeneratorAdmin(
      userId,
      facts.record.performedByUserId,
      facts.authzGenerator
    )
    if (!allowed) return fail('Can only edit your own maintenance records')

    if (Object.keys(fields).length > 0)
      await db
        .update(maintenanceRecords)
        .set(fields)
        .where(eq(maintenanceRecords.id, id))

    return ok
  }

  return fail('Invalid operation on maintenance_records')
}
