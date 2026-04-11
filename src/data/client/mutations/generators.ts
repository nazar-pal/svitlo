import { eq } from 'drizzle-orm'

import { generators, maintenanceTemplates } from '@/data/client/db-schema'
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

      await ctx.writeTx(async tx => {
        await tx.insert(generators).values({
          id: generatorId,
          organizationId: parsed.data.organizationId,
          title: parsed.data.title,
          model: parsed.data.model,
          description: parsed.data.description ?? null,
          maxConsecutiveRunHours: parsed.data.maxConsecutiveRunHours,
          requiredRestHours: parsed.data.requiredRestHours,
          runWarningThresholdPct: parsed.data.runWarningThresholdPct,
          createdAt: now
        })

        for (const mi of maintenanceInputs) {
          const mParsed = insertMaintenanceTemplateSchema.parse({
            ...mi,
            generatorId
          })
          await tx.insert(maintenanceTemplates).values({
            id: ctx.newId(),
            generatorId,
            taskName: mParsed.taskName,
            description: mParsed.description ?? null,
            triggerType: mParsed.triggerType,
            triggerHoursInterval: mParsed.triggerHoursInterval ?? null,
            triggerCalendarDays: mParsed.triggerCalendarDays ?? null,
            isOneTime: mParsed.isOneTime ? 1 : 0,
            createdAt: now
          })
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
