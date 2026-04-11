import { eq } from 'drizzle-orm'

import { generators } from '@/data/client/db-schema'
import {
  insertGeneratorSchema,
  insertMaintenanceTemplateSchema,
  updateGeneratorSchema,
  type InsertGeneratorInput,
  type InsertMaintenanceTemplateInput,
  type UpdateGeneratorInput
} from '@/data/client/validation'
import { failFromZod } from '@/data/shared/errors-from-zod'
import { fail, ok, type MutationResult } from '@/data/shared/result'

import type { MutationContext } from './context'

export function createGeneratorMutations(ctx: MutationContext) {
  return {
    async updateGenerator(
      userId: string,
      generatorId: string,
      input: UpdateGeneratorInput
    ): Promise<MutationResult> {
      const parsed = updateGeneratorSchema.safeParse(input)
      if (!parsed.success) return failFromZod(parsed.error)

      const check = await ctx.checks.generators.updateGenerator(
        userId,
        generatorId
      )
      if (!check.ok) return fail(check.code)

      await ctx.db
        .update(generators)
        .set(parsed.data)
        .where(eq(generators.id, generatorId))

      return ok
    },

    async createGeneratorWithMaintenance(
      userId: string,
      input: InsertGeneratorInput,
      maintenanceInputs: Omit<InsertMaintenanceTemplateInput, 'generatorId'>[]
    ): Promise<MutationResult> {
      const parsed = insertGeneratorSchema.safeParse(input)
      if (!parsed.success) return failFromZod(parsed.error)

      const check = await ctx.checks.generators.createGenerator(
        userId,
        parsed.data.organizationId
      )
      if (!check.ok) return fail(check.code)

      const generatorId = ctx.newId()
      const now = ctx.now().toISOString()

      for (const mi of maintenanceInputs) {
        const mParsed = insertMaintenanceTemplateSchema.safeParse({
          ...mi,
          generatorId
        })
        if (!mParsed.success)
          return fail('MAINTENANCE_TASK_VALIDATION_FAILED', {
            taskName: mi.taskName
          })
      }

      await ctx.powersync.writeTransaction(async tx => {
        await tx.execute(
          'INSERT INTO generators (id, organization_id, title, model, description, max_consecutive_run_hours, required_rest_hours, run_warning_threshold_pct, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            generatorId,
            parsed.data.organizationId,
            parsed.data.title,
            parsed.data.model,
            parsed.data.description ?? null,
            parsed.data.maxConsecutiveRunHours,
            parsed.data.requiredRestHours,
            parsed.data.runWarningThresholdPct,
            now
          ]
        )

        for (const mi of maintenanceInputs) {
          const mParsed = insertMaintenanceTemplateSchema.parse({
            ...mi,
            generatorId
          })
          await tx.execute(
            'INSERT INTO maintenance_templates (id, generator_id, task_name, description, trigger_type, trigger_hours_interval, trigger_calendar_days, is_one_time, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              ctx.newId(),
              generatorId,
              mParsed.taskName,
              mParsed.description ?? null,
              mParsed.triggerType,
              mParsed.triggerHoursInterval ?? null,
              mParsed.triggerCalendarDays ?? null,
              mParsed.isOneTime ? 1 : 0,
              now
            ]
          )
        }
      })

      return ok
    },

    async deleteGenerator(
      userId: string,
      generatorId: string
    ): Promise<MutationResult> {
      const check = await ctx.checks.generators.deleteGenerator(
        userId,
        generatorId
      )
      if (!check.ok) return fail(check.code)

      await ctx.db.delete(generators).where(eq(generators.id, generatorId))

      return ok
    }
  }
}
