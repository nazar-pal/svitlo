import { eq } from 'drizzle-orm'

import { maintenanceRecords } from '@/data/server/db-schema'
import { createServerAuthz } from '@/data/server/authz'

import { replayShieldNotFound } from './replay'
import { transformSyncData } from '../transform'
import { fail, ok, type Insert, type TableHandler } from './types'

export const handleMaintenanceRecords: TableHandler = async ctx => {
  const { db, userId, op, id, data } = ctx
  const checks = ctx.checks.maintenance

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof maintenanceRecords>>(data)
    const generatorId = values.generatorId as string
    const templateId = values.templateId as string

    const result = await checks.recordMaintenance(userId, {
      generatorId,
      templateId
    })
    if (!result.ok) return fail(result.code)

    await db
      .insert(maintenanceRecords)
      .values({ ...values, id, performedByUserId: userId })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'delete') {
    const shielded = replayShieldNotFound(
      await checks.deleteRecord(userId, id),
      'RECORD_NOT_FOUND'
    )
    if (shielded.status === 'consume') return shielded.result

    // Server-only extra: non-admins may only delete their own records. The
    // shared policy allows any user with generator access, matching client
    // behaviour; the server layers an ownership rule on top as defence in
    // depth for the sync protocol. Reuse the record the policy already
    // fetched — no second `findRecord` round trip. Same pattern as the
    // session delete handler.
    const authz = createServerAuthz(db)
    const { record } = shielded.data
    const isAdmin = await authz.isGeneratorOrgAdmin(userId, record.generatorId)
    if (!isAdmin && record.performedByUserId !== userId)
      return fail('Can only delete your own maintenance records')

    await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, id))
    return ok
  }

  if (op === 'update') {
    // Notes-only update path. The shared `deleteMaintenanceRecordPolicy`
    // encodes exactly the rule we need here ("row must exist, caller must
    // have generator access") — we reuse `checks.deleteRecord` as the rule
    // gate even though this is an update, because the server's wire shape
    // for record updates never carries `performedAt`, so the richer
    // `updateRecord` path (which enforces the future-date check) does not
    // apply. Routing through the shared check keeps the rules in one place.
    const result = await checks.deleteRecord(userId, id)
    if (!result.ok) {
      if (result.code === 'RECORD_NOT_FOUND') return fail('Record not found')
      return fail(result.code)
    }

    const fields: Partial<Insert<typeof maintenanceRecords>> = {}
    if ('notes' in data)
      fields.notes = data.notes == null ? null : String(data.notes)

    if (Object.keys(fields).length > 0)
      await db
        .update(maintenanceRecords)
        .set(fields)
        .where(eq(maintenanceRecords.id, id))

    return ok
  }

  return fail('Invalid operation on maintenance_records')
}
