import { z } from 'zod'

import { maintenanceAgent } from '@/data/server/ai/maintenance-agent'

import { createTRPCRouter, protectedProcedure } from '../trpc'

const maintenanceSuggestionSchema = z.object({
  maxConsecutiveRunHours: z.number().nullable(),
  requiredRestHours: z.number().nullable(),
  tasks: z.array(
    z.object({
      taskName: z.string(),
      description: z.string(),
      triggerType: z.enum(['hours', 'calendar', 'whichever_first']),
      triggerHoursInterval: z.number().nullable(),
      triggerCalendarDays: z.number().int().nullable(),
      isOneTime: z.boolean()
    })
  ),
  sources: z.array(z.string()),
  modelInfo: z.string()
})

export const aiRouter = createTRPCRouter({
  suggestMaintenancePlan: protectedProcedure
    .input(
      z.object({
        generatorModel: z.string(),
        description: z.string().optional()
      })
    )
    .mutation(async ({ input }) => {
      const prompt = [
        `Generator: ${input.generatorModel}`,
        input.description ? `Description: ${input.description}` : null
      ]
        .filter(Boolean)
        .join('\n')

      const result = await maintenanceAgent.generate(prompt, {
        structuredOutput: {
          schema: maintenanceSuggestionSchema,
          jsonPromptInjection: true
        }
      })

      return result.object
    })
})
