import { z } from 'zod'

import { usesCalendar, usesHours } from '@/lib/maintenance/trigger-type'

export const rawTaskSchema = z.object({
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

export const taskSchema = rawTaskSchema.superRefine((task, ctx) => {
  if (usesHours(task.triggerType) && task.triggerHoursInterval == null)
    ctx.addIssue({
      code: 'custom',
      path: ['triggerHoursInterval'],
      message: 'Required for this trigger type'
    })

  if (usesCalendar(task.triggerType) && task.triggerCalendarDays == null)
    ctx.addIssue({
      code: 'custom',
      path: ['triggerCalendarDays'],
      message: 'Required for this trigger type'
    })
})

export const maintenanceSuggestionSchema = z.object({
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

export type SuggestionTask = z.infer<typeof taskSchema>
export type MaintenanceSuggestion = z.infer<typeof maintenanceSuggestionSchema>
