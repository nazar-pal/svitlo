import { eq } from 'drizzle-orm'
import type { z } from 'zod'

import { generators, maintenanceTemplates } from '@/data/client/db-schema'
import type { CheckFacade } from '@/data/shared/checks'
import { fail } from '@/data/shared/result'
import {
  insertGeneratorSchema,
  insertMaintenanceTemplateSchema,
  updateGeneratorSchema,
  type InsertGeneratorInput,
  type InsertMaintenanceTemplateInput,
  type UpdateGeneratorInput
} from '@/data/shared/validation'

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
        c.checks.generators.updateGenerator({ userId, generatorId }),
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
      z.output<typeof insertGeneratorSchema>,
      Awaited<ReturnType<CheckFacade['generators']['createGenerator']>>,
      z.output<typeof insertMaintenanceTemplateSchema>[]
    >(ctx, {
      parse: ([, input]) => insertGeneratorSchema.safeParse(input),

      // Validates each template and forwards Zod-transformed data (trimmed
      // strings, defaults applied) to apply — eliminating a second parse there.
      // The placeholder generatorId satisfies the schema's required field;
      // apply overwrites it with the real generatorId.
      validate: ([, , maintenanceInputs]) => {
        const templates: z.output<typeof insertMaintenanceTemplateSchema>[] = []
        for (const mi of maintenanceInputs) {
          const r = insertMaintenanceTemplateSchema.safeParse({
            ...mi,
            generatorId: 'placeholder'
          })
          if (!r.success)
            return fail('MAINTENANCE_TASK_VALIDATION_FAILED', {
              taskName: mi.taskName
            })
          templates.push(r.data)
        }
        return { validated: templates }
      },

      check: (c, [userId], parsed) =>
        c.checks.generators.createGenerator({
          userId,
          organizationId: parsed.organizationId
        }),

      tx: true,

      apply: async ({ ctx: c, db, parsed, validated: templates }) => {
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

        for (const template of templates) {
          await db.insert(maintenanceTemplates).values({
            id: c.newId(),
            generatorId,
            taskName: template.taskName,
            description: template.description ?? null,
            triggerType: template.triggerType,
            triggerHoursInterval: template.triggerHoursInterval ?? null,
            triggerCalendarDays: template.triggerCalendarDays ?? null,
            isOneTime: template.isOneTime ? 1 : 0,
            createdAt: now
          })
        }
      }
    }),

    deleteGenerator: defineMutation<[string, string]>(ctx, {
      check: (c, [userId, generatorId]) =>
        c.checks.generators.deleteGenerator({ userId, generatorId }),
      apply: async ({ db, args: [, generatorId] }) => {
        await db.delete(generators).where(eq(generators.id, generatorId))
      }
    })
  }
}
