import { eq } from 'drizzle-orm'

import { updateMaintenanceTemplateSchema } from '@/data/shared/validation'
import { maintenanceTemplates } from '@/data/server/db-schema'

import { defineTableHandler } from './pipeline'
import type { Insert } from './types'

export const handleMaintenanceTemplates = defineTableHandler({
  table: maintenanceTemplates,
  insert: {
    // No `schema:` by design — the PG CHECK constraint
    // `trigger_fields_match_type` (plus the positive-number / non-empty-name
    // checks) is the server-side source of truth for payload shape, and the
    // integration tests assert those constraints directly. Adding a Zod
    // schema here would short-circuit those tests and duplicate the rule.
    check: ({ userId, checks }, parsed) =>
      checks.maintenance.createTemplate({
        userId,
        generatorId: parsed.generatorId as string
      }),
    apply: async ({ db, id }, parsed) => {
      const values = parsed as Insert<typeof maintenanceTemplates>
      await db
        .insert(maintenanceTemplates)
        .values({ ...values, id })
        .onConflictDoNothing()
    }
  },
  update: {
    schema: updateMaintenanceTemplateSchema,
    errorLabel: 'maintenance template update',
    check: ({ userId, id, checks }, parsed) =>
      checks.maintenance.updateTemplate({
        userId,
        templateId: id,
        update: {
          triggerType: parsed.triggerType,
          triggerHoursInterval: parsed.triggerHoursInterval,
          triggerCalendarDays: parsed.triggerCalendarDays
        }
      }),
    apply: async ({ db, id }, parsed) => {
      if (Object.keys(parsed).length > 0)
        await db
          .update(maintenanceTemplates)
          .set(parsed)
          .where(eq(maintenanceTemplates.id, id))
    }
  },
  delete: {
    check: ({ userId, id, checks }) =>
      checks.maintenance.deleteTemplate({ userId, templateId: id }),
    shield: { kind: 'notFound', code: 'TEMPLATE_NOT_FOUND' },
    apply: async ({ db, id }) => {
      await db
        .delete(maintenanceTemplates)
        .where(eq(maintenanceTemplates.id, id))
    }
  }
})
