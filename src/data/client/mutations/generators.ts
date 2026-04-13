import { eq } from 'drizzle-orm'
import type { z } from 'zod'

import { generators, maintenanceTemplates } from '@/data/client/db-schema'
import {
  insertGeneratorSchema,
  insertMaintenanceTemplateSchema,
  updateGeneratorSchema,
  type InsertGeneratorInput,
  type InsertMaintenanceTemplateInput,
  type UpdateGeneratorInput
} from '@/data/shared/validation'
import { fail } from '@/data/shared/result'

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

    createGeneratorWithMaintenance: defineMutation<
      [
        string,
        InsertGeneratorInput,
        Omit<InsertMaintenanceTemplateInput, 'generatorId'>[]
      ],
      z.output<typeof insertGeneratorSchema>
    >(ctx, {
      parse: ([, input]) => insertGeneratorSchema.safeParse(input),
      validate: ([, , maintenanceInputs]) => {
        for (const mi of maintenanceInputs) {
          const r = insertMaintenanceTemplateSchema.safeParse({
            ...mi,
            generatorId: 'placeholder'
          })
          if (!r.success)
            return fail('MAINTENANCE_TASK_VALIDATION_FAILED', {
              taskName: mi.taskName
            })
        }
      },
      check: (c, [userId], parsed) =>
        c.checks.generators.createGenerator(userId, parsed.organizationId),
      tx: true,
      apply: async ({ ctx: c, db, args: [, , maintenanceInputs], parsed }) => {
        const generatorId = c.newId()
        const now = c.now().toISOString()

        await db.insert(generators).values({
          id: generatorId,
          organizationId: parsed.organizationId,
          title: parsed.title,
          model: parsed.model,
          description: parsed.description ?? null,
          maxConsecutiveRunHours: parsed.maxConsecutiveRunHours,
          requiredRestHours: parsed.requiredRestHours,
          runWarningThresholdPct: parsed.runWarningThresholdPct,
          createdAt: now
        })

        for (const mi of maintenanceInputs) {
          const m = insertMaintenanceTemplateSchema.parse({
            ...mi,
            generatorId
          })
          await db.insert(maintenanceTemplates).values({
            id: c.newId(),
            generatorId,
            taskName: m.taskName,
            description: m.description ?? null,
            triggerType: m.triggerType,
            triggerHoursInterval: m.triggerHoursInterval ?? null,
            triggerCalendarDays: m.triggerCalendarDays ?? null,
            isOneTime: m.isOneTime ? 1 : 0,
            createdAt: now
          })
        }
      }
    }),

    deleteGenerator: defineMutation<[string, string]>(ctx, {
      check: (c, [userId, generatorId]) =>
        c.checks.generators.deleteGenerator(userId, generatorId),
      apply: async ({ db, args: [, generatorId] }) => {
        await db.delete(generators).where(eq(generators.id, generatorId))
      }
    })
  }
}
