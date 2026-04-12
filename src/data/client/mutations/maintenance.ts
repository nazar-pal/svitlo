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
import { failFromZod } from '@/data/shared/errors-from-zod'
import { fail, ok, type MutationResult } from '@/data/shared/result'

import type { MutationContext } from './context'

export function createMaintenanceMutations(ctx: MutationContext) {
  return {
    async createMaintenanceTemplate(
      userId: string,
      input: InsertMaintenanceTemplateInput
    ): Promise<MutationResult> {
      const parsed = insertMaintenanceTemplateSchema.safeParse(input)
      if (!parsed.success) return failFromZod(parsed.error)

      const result = await ctx.checks.maintenance.createTemplate(userId, {
        generatorId: parsed.data.generatorId
      })
      if (!result.ok) return fail(result.code)

      await ctx.db.insert(maintenanceTemplates).values({
        id: ctx.newId(),
        generatorId: parsed.data.generatorId,
        taskName: parsed.data.taskName,
        description: parsed.data.description ?? null,
        triggerType: parsed.data.triggerType,
        triggerHoursInterval: parsed.data.triggerHoursInterval ?? null,
        triggerCalendarDays: parsed.data.triggerCalendarDays ?? null,
        isOneTime: parsed.data.isOneTime ? 1 : 0,
        createdAt: ctx.now().toISOString()
      })

      return ok
    },

    async updateMaintenanceTemplate(
      userId: string,
      templateId: string,
      input: UpdateMaintenanceTemplateInput
    ): Promise<MutationResult> {
      const parsed = updateMaintenanceTemplateSchema.safeParse(input)
      if (!parsed.success) return failFromZod(parsed.error)

      const result = await ctx.checks.maintenance.updateTemplate(
        userId,
        templateId,
        {
          triggerType: parsed.data.triggerType,
          triggerHoursInterval: parsed.data.triggerHoursInterval,
          triggerCalendarDays: parsed.data.triggerCalendarDays
        }
      )
      if (!result.ok) return fail(result.code)

      const { isOneTime, ...rest } = parsed.data
      await ctx.db
        .update(maintenanceTemplates)
        .set({
          ...rest,
          ...(isOneTime != null && { isOneTime: isOneTime ? 1 : 0 })
        })
        .where(eq(maintenanceTemplates.id, templateId))

      return ok
    },

    async deleteMaintenanceTemplate(
      userId: string,
      templateId: string
    ): Promise<MutationResult> {
      const result = await ctx.checks.maintenance.deleteTemplate(
        userId,
        templateId
      )
      if (!result.ok) return fail(result.code)

      await ctx.db
        .delete(maintenanceTemplates)
        .where(eq(maintenanceTemplates.id, templateId))

      return ok
    },

    // No ownership check needed: PowerSync sync rules + client-side filtering
    // ensure users only see activity for generators they can access (admin or
    // assigned).
    async deleteMaintenanceRecord(
      userId: string,
      recordId: string
    ): Promise<MutationResult> {
      const result = await ctx.checks.maintenance.deleteRecord(userId, recordId)
      if (!result.ok) return fail(result.code)

      await ctx.db
        .delete(maintenanceRecords)
        .where(eq(maintenanceRecords.id, recordId))

      return ok
    },

    // No ownership check needed: PowerSync sync rules + client-side filtering
    // ensure users only see activity for generators they can access (admin or
    // assigned).
    async updateMaintenanceRecord(
      userId: string,
      recordId: string,
      input: { performedAt: string; notes: string | null }
    ): Promise<MutationResult> {
      const result = await ctx.checks.maintenance.updateRecord(
        userId,
        recordId,
        { performedAt: input.performedAt },
        ctx.now()
      )
      if (!result.ok) return fail(result.code)

      await ctx.db
        .update(maintenanceRecords)
        .set({
          performedAt: input.performedAt,
          notes: input.notes
        })
        .where(eq(maintenanceRecords.id, recordId))

      return ok
    },

    async recordMaintenance(
      userId: string,
      input: InsertMaintenanceRecordInput
    ): Promise<MutationResult> {
      const parsed = insertMaintenanceRecordSchema.safeParse(input)
      if (!parsed.success) return failFromZod(parsed.error)

      const result = await ctx.checks.maintenance.recordMaintenance(userId, {
        generatorId: parsed.data.generatorId,
        templateId: parsed.data.templateId
      })
      if (!result.ok) return fail(result.code)

      await ctx.db.insert(maintenanceRecords).values({
        id: ctx.newId(),
        templateId: parsed.data.templateId,
        generatorId: parsed.data.generatorId,
        performedByUserId: userId,
        performedAt: parsed.data.performedAt ?? ctx.now().toISOString(),
        notes: parsed.data.notes ?? null
      })

      return ok
    }
  }
}
