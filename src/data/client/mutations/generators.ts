import { eq } from 'drizzle-orm'

import { generators, maintenanceTemplates } from '@/data/client/db-schema'
import {
  insertGeneratorSchema,
  insertMaintenanceTemplateSchema,
  updateGeneratorSchema,
  type InsertGeneratorInput,
  type InsertMaintenanceTemplateInput,
  type UpdateGeneratorInput
} from '@/data/shared/validation'
import { failFromZod } from '@/data/shared/errors-from-zod'
import { fail, ok, type MutationResult } from '@/data/shared/result'

import type { MutationContext } from './context'
import { defineMutation } from './pipeline'

export function createGeneratorMutations(ctx: MutationContext) {
  return {
    updateGenerator: defineMutation<
      [string, string, UpdateGeneratorInput],
      UpdateGeneratorInput
    >(ctx, {
      parse: ([, , input]) => updateGeneratorSchema.safeParse(input),
      check: (c, [userId, generatorId]) =>
        c.checks.generators.updateGenerator(userId, generatorId),
      apply: async ({ db, args: [, generatorId], parsed }) => {
        await db
          .update(generators)
          .set(parsed)
          .where(eq(generators.id, generatorId))
      }
    }),

    // Stays imperative: the pre-`writeTx` validation loop emits the
    // parameterized `MAINTENANCE_TASK_VALIDATION_FAILED` code with
    // `{ taskName }`, which the `defineMutation` check model (scoped to
    // param-free codes) cannot express.
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

    deleteGenerator: defineMutation<[string, string]>(ctx, {
      check: (c, [userId, generatorId]) =>
        c.checks.generators.deleteGenerator(userId, generatorId),
      apply: async ({ db, args: [, generatorId] }) => {
        await db.delete(generators).where(eq(generators.id, generatorId))
      }
    })
  }
}
