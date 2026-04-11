import { eq } from 'drizzle-orm'

import { maintenanceTemplates } from '@/data/server/db-schema'

import { replayShieldNotFound } from './replay'
import { transformSyncData } from '../transform'
import { fail, ok, type Insert, type TableHandler } from './types'

export const handleMaintenanceTemplates: TableHandler = async ctx => {
  const { db, userId, op, id, data } = ctx
  const checks = ctx.checks.maintenance

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof maintenanceTemplates>>(data)
    const generatorId = values.generatorId as string

    const result = await checks.createTemplate(userId, { generatorId })
    if (!result.ok) return fail(result.code)

    await db
      .insert(maintenanceTemplates)
      .values({ ...values, id })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'update') {
    const fields =
      transformSyncData<Partial<Insert<typeof maintenanceTemplates>>>(data)

    // The shared check fetches the template and runs the companion-field
    // merging itself — pass only the trigger-related keys through so it can
    // make the merge decision. Unknown keys are dropped.
    const result = await checks.updateTemplate(userId, id, {
      triggerType: fields.triggerType,
      triggerHoursInterval: fields.triggerHoursInterval,
      triggerCalendarDays: fields.triggerCalendarDays
    })
    if (!result.ok) return fail(result.code)

    if (Object.keys(fields).length > 0)
      await db
        .update(maintenanceTemplates)
        .set(fields)
        .where(eq(maintenanceTemplates.id, id))

    return ok
  }

  if (op === 'delete') {
    const shielded = replayShieldNotFound(
      await checks.deleteTemplate(userId, id),
      'TEMPLATE_NOT_FOUND'
    )
    if (shielded.status === 'consume') return shielded.result

    await db.delete(maintenanceTemplates).where(eq(maintenanceTemplates.id, id))
    return ok
  }

  return fail('Invalid operation')
}
