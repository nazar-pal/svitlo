import { eq } from 'drizzle-orm'

import { updateMaintenanceTemplateSchema } from '@/data/shared/validation'
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
    const transformed =
      transformSyncData<Partial<Insert<typeof maintenanceTemplates>>>(data)
    const parsed = updateMaintenanceTemplateSchema.safeParse(transformed)
    if (!parsed.success)
      return fail(
        `Invalid maintenance template update: ${parsed.error.message}`
      )

    const result = await checks.updateTemplate(userId, id, {
      triggerType: parsed.data.triggerType,
      triggerHoursInterval: parsed.data.triggerHoursInterval,
      triggerCalendarDays: parsed.data.triggerCalendarDays
    })
    if (!result.ok) return fail(result.code)

    if (Object.keys(parsed.data).length > 0)
      await db
        .update(maintenanceTemplates)
        .set(parsed.data)
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
