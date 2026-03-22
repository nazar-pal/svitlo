import { z } from 'zod'

import { maintenanceAgent } from '@/data/server/ai/maintenance-agent'

import { protectedProcedure } from '../orpc'

const rawTaskSchema = z.object({
  taskName: z.string().describe('Name of the maintenance task'),
  description: z.string().describe('What this task involves'),
  triggerType: z
    .enum(['hours', 'calendar', 'whichever_first'])
    .describe(
      'When this task triggers. "hours" = by runtime hours, "calendar" = by calendar days, "whichever_first" = whichever threshold is reached first'
    ),
  triggerHoursInterval: z
    .number()
    .nullable()
    .describe(
      'Runtime hours between maintenance. Required for "hours" and "whichever_first", must be null for "calendar"'
    ),
  triggerCalendarDays: z
    .number()
    .int()
    .nullable()
    .describe(
      'Calendar days between maintenance. Required for "calendar" and "whichever_first", must be null for "hours"'
    ),
  isOneTime: z
    .boolean()
    .describe('True for tasks performed only once (e.g. break-in oil change)')
})

const taskSchema = rawTaskSchema.superRefine((task, ctx) => {
  const needsHours =
    task.triggerType === 'hours' || task.triggerType === 'whichever_first'
  const needsDays =
    task.triggerType === 'calendar' || task.triggerType === 'whichever_first'

  if (needsHours && task.triggerHoursInterval == null)
    ctx.addIssue({
      code: 'custom',
      path: ['triggerHoursInterval'],
      message: 'Required for this trigger type'
    })

  if (needsDays && task.triggerCalendarDays == null)
    ctx.addIssue({
      code: 'custom',
      path: ['triggerCalendarDays'],
      message: 'Required for this trigger type'
    })
})

const maintenanceSuggestionSchema = z.object({
  maxConsecutiveRunHours: z
    .number()
    .nullable()
    .describe('Manufacturer-recommended max consecutive runtime hours'),
  requiredRestHours: z
    .number()
    .nullable()
    .describe('Recommended cooldown/rest hours after max runtime'),
  tasks: z.array(taskSchema),
  sources: z.array(z.string()).describe('URLs of sources used for research'),
  modelInfo: z
    .string()
    .describe(
      'Human-readable summary of the generator model and data sources used'
    ),
  isGeneric: z
    .boolean()
    .describe(
      'True if no specific manufacturer data was found and the plan uses generic industry defaults'
    )
})

const rawSuggestionSchema = z.object({
  maxConsecutiveRunHours: z.number().nullable(),
  requiredRestHours: z.number().nullable(),
  tasks: z.array(rawTaskSchema),
  sources: z.array(z.string()),
  modelInfo: z.string(),
  isGeneric: z.boolean()
})

export const DEFAULT_CALENDAR_DAYS = 90
export const ASSUMED_DAILY_HOURS = 8

export function repairTasks(
  tasks: z.infer<typeof rawSuggestionSchema>['tasks']
): z.infer<typeof maintenanceSuggestionSchema>['tasks'] {
  return tasks.map(task => {
    const hours = task.triggerHoursInterval
    const days = task.triggerCalendarDays

    switch (task.triggerType) {
      case 'hours':
        if (hours != null) return task
        return {
          ...task,
          triggerType: 'calendar' as const,
          triggerCalendarDays: DEFAULT_CALENDAR_DAYS,
          triggerHoursInterval: null
        }

      case 'calendar':
        if (days != null) return task
        return { ...task, triggerCalendarDays: DEFAULT_CALENDAR_DAYS }

      case 'whichever_first': {
        if (hours != null && days != null) return task

        if (hours != null && days == null)
          return {
            ...task,
            triggerCalendarDays: Math.ceil(hours / ASSUMED_DAILY_HOURS)
          }

        if (days != null && hours == null)
          return { ...task, triggerHoursInterval: days * ASSUMED_DAILY_HOURS }

        return {
          ...task,
          triggerType: 'calendar' as const,
          triggerCalendarDays: DEFAULT_CALENDAR_DAYS,
          triggerHoursInterval: null
        }
      }

      default:
        throw new Error(
          `Unknown trigger type: ${task.triggerType satisfies never}`
        )
    }
  })
}

export function genericFallback(
  model: string
): z.infer<typeof rawSuggestionSchema> {
  return {
    maxConsecutiveRunHours: 8,
    requiredRestHours: 4,
    tasks: [
      {
        taskName: 'Oil level check',
        description: 'Check engine oil level and top up if needed',
        triggerType: 'hours',
        triggerHoursInterval: 20,
        triggerCalendarDays: null,
        isOneTime: false
      },
      {
        taskName: 'Oil change',
        description: 'Drain and replace engine oil, replace oil filter',
        triggerType: 'whichever_first',
        triggerHoursInterval: 100,
        triggerCalendarDays: 180,
        isOneTime: false
      },
      {
        taskName: 'Air filter',
        description: 'Inspect and clean or replace the air filter element',
        triggerType: 'whichever_first',
        triggerHoursInterval: 200,
        triggerCalendarDays: 365,
        isOneTime: false
      },
      {
        taskName: 'Spark plug',
        description: 'Inspect, clean, or replace the spark plug',
        triggerType: 'hours',
        triggerHoursInterval: 300,
        triggerCalendarDays: null,
        isOneTime: false
      }
    ],
    sources: [],
    modelInfo: `Could not find specific data for "${model}". Using generic defaults.`,
    isGeneric: true
  }
}

export const aiRouter = {
  suggestMaintenancePlan: protectedProcedure
    .input(
      z.object({
        generatorModel: z.string(),
        description: z.string().optional(),
        locale: z.enum(['en', 'uk']).default('en')
      })
    )
    .output(maintenanceSuggestionSchema)
    .handler(async ({ input }) => {
      const localeBlock =
        input.locale === 'uk'
          ? [
              'OUTPUT LANGUAGE: Ukrainian (uk)',
              '- taskName: write in Ukrainian',
              '- description: write in Ukrainian',
              '- modelInfo: write in Ukrainian',
              '- triggerType: ALWAYS use exact English values ("hours", "calendar", "whichever_first")',
              '- sources: keep original URLs',
              '- All numeric fields and booleans: keep as-is'
            ].join('\n')
          : null

      const prompt = [
        `Generator: ${input.generatorModel}`,
        input.description ? `Description: ${input.description}` : null,
        localeBlock
      ]
        .filter(Boolean)
        .join('\n')

      let raw: z.infer<typeof rawSuggestionSchema>

      try {
        const result = await maintenanceAgent.generate(prompt, {
          structuredOutput: {
            schema: rawSuggestionSchema,
            jsonPromptInjection: true
          }
        })
        raw = rawSuggestionSchema.parse(result.object)
      } catch {
        raw = genericFallback(input.generatorModel)
      }

      // Force isGeneric if no real sources were found
      const isGeneric = raw.isGeneric || raw.sources.length === 0

      const repairedTasks = repairTasks(raw.tasks)

      return maintenanceSuggestionSchema.parse({
        ...raw,
        isGeneric,
        tasks: repairedTasks
      })
    })
}
