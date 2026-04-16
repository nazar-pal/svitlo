import { eq } from 'drizzle-orm'

import {
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/client/db-schema'
import {
  insertMaintenanceRecordSchema,
  insertMaintenanceTemplateSchema,
  updateMaintenanceTemplateSchema,
  type InsertMaintenanceRecordInput,
  type InsertMaintenanceTemplateInput,
  type UpdateMaintenanceTemplateInput
} from '@/data/shared/validation'

import type { MutationContext } from './context'
import { defineMutation } from './pipeline'

export function createMaintenanceMutations(ctx: MutationContext) {
  return {
    createMaintenanceTemplate: defineMutation<
      [string, InsertMaintenanceTemplateInput],
      InsertMaintenanceTemplateInput
    >(ctx, {
      parse: ([, input]) => insertMaintenanceTemplateSchema.safeParse(input),
      check: (c, [userId], parsed) =>
        c.checks.maintenance.createTemplate({
          userId,
          generatorId: parsed.generatorId
        }),
      apply: async ({ ctx: c, db, parsed }) => {
        await db.insert(maintenanceTemplates).values({
          id: c.newId(),
          generatorId: parsed.generatorId,
          taskName: parsed.taskName,
          description: parsed.description ?? null,
          triggerType: parsed.triggerType,
          triggerHoursInterval: parsed.triggerHoursInterval ?? null,
          triggerCalendarDays: parsed.triggerCalendarDays ?? null,
          isOneTime: parsed.isOneTime ? 1 : 0,
          createdAt: c.now().toISOString()
        })
      }
    }),

    updateMaintenanceTemplate: defineMutation<
      [string, string, UpdateMaintenanceTemplateInput],
      UpdateMaintenanceTemplateInput
    >(ctx, {
      parse: ([, , input]) => updateMaintenanceTemplateSchema.safeParse(input),
      check: (c, [userId, templateId], parsed) =>
        c.checks.maintenance.updateTemplate({
          userId,
          templateId,
          update: {
            triggerType: parsed.triggerType,
            triggerHoursInterval: parsed.triggerHoursInterval,
            triggerCalendarDays: parsed.triggerCalendarDays
          }
        }),
      apply: async ({ db, args: [, templateId], parsed }) => {
        const { isOneTime, ...rest } = parsed
        await db
          .update(maintenanceTemplates)
          .set({
            ...rest,
            ...(isOneTime != null && { isOneTime: isOneTime ? 1 : 0 })
          })
          .where(eq(maintenanceTemplates.id, templateId))
      }
    }),

    deleteMaintenanceTemplate: defineMutation<[string, string]>(ctx, {
      check: (c, [userId, templateId]) =>
        c.checks.maintenance.deleteTemplate({ userId, templateId }),
      apply: async ({ db, args: [, templateId] }) => {
        await db
          .delete(maintenanceTemplates)
          .where(eq(maintenanceTemplates.id, templateId))
      }
    }),

    // Client gates on generator access only; the server handler layers an
    // "admin or original recorder" rule on top as defence in depth. Local
    // optimistic deletes by non-owners will reconcile with a sync-time
    // rejection. See `handleMaintenanceRecords` for the server check.
    deleteMaintenanceRecord: defineMutation<[string, string]>(ctx, {
      check: (c, [userId, recordId]) =>
        c.checks.maintenance.deleteRecord({ userId, recordId }),
      apply: async ({ db, args: [, recordId] }) => {
        await db
          .delete(maintenanceRecords)
          .where(eq(maintenanceRecords.id, recordId))
      }
    }),

    // Client gates on generator access only; the server handler layers an
    // "admin or original recorder" rule on top as defence in depth. Local
    // optimistic edits by non-owners will reconcile with a sync-time
    // rejection. See `handleMaintenanceRecords` for the server check.
    updateMaintenanceRecord: defineMutation<
      [string, string, { performedAt: string; notes: string | null }]
    >(ctx, {
      check: (c, [userId, recordId, input]) =>
        c.checks.maintenance.updateRecord({
          userId,
          recordId,
          performedAt: input.performedAt,
          now: c.now()
        }),
      apply: async ({ db, args: [, recordId, input] }) => {
        await db
          .update(maintenanceRecords)
          .set({
            performedAt: input.performedAt,
            notes: input.notes
          })
          .where(eq(maintenanceRecords.id, recordId))
      }
    }),

    recordMaintenance: defineMutation<
      [string, InsertMaintenanceRecordInput],
      InsertMaintenanceRecordInput
    >(ctx, {
      parse: ([, input]) => insertMaintenanceRecordSchema.safeParse(input),
      check: (c, [userId], parsed) =>
        c.checks.maintenance.recordMaintenance({
          userId,
          generatorId: parsed.generatorId,
          templateId: parsed.templateId
        }),
      apply: async ({ ctx: c, db, args: [userId], parsed }) => {
        await db.insert(maintenanceRecords).values({
          id: c.newId(),
          templateId: parsed.templateId,
          generatorId: parsed.generatorId,
          performedByUserId: userId,
          performedAt: parsed.performedAt ?? c.now().toISOString(),
          notes: parsed.notes ?? null
        })
      }
    })
  }
}
