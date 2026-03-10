import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { textId, textTimestamp } from './utils'

export const generators = sqliteTable('generators', {
  id: textId(),
  organizationId: text('organization_id').notNull(),
  name: text('name').notNull(),
  generatorType: text('generator_type').notNull(),
  description: text('description'),
  maxConsecutiveRunHours: real('max_consecutive_run_hours').notNull(),
  requiredRestHours: real('required_rest_hours').notNull(),
  runWarningThresholdPct: integer('run_warning_threshold_pct').notNull(),
  createdAt: textTimestamp('created_at')
})

export type Generator = typeof generators.$inferSelect

export const generatorUserAssignments = sqliteTable(
  'generator_user_assignments',
  {
    id: textId(),
    generatorId: text('generator_id').notNull(),
    userId: text('user_id').notNull(),
    assignedAt: textTimestamp('assigned_at')
  }
)

export type GeneratorUserAssignment =
  typeof generatorUserAssignments.$inferSelect

export const generatorSessions = sqliteTable('generator_sessions', {
  id: textId(),
  generatorId: text('generator_id').notNull(),
  startedByUserId: text('started_by_user_id').notNull(),
  stoppedByUserId: text('stopped_by_user_id'),
  startedAt: textTimestamp('started_at'),
  stoppedAt: text('stopped_at')
})

export type GeneratorSession = typeof generatorSessions.$inferSelect
