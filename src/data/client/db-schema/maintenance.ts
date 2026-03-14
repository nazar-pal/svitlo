import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { textId, textTimestamp } from './utils'

export const maintenanceTemplates = sqliteTable('maintenance_templates', {
  id: textId(),
  generatorId: text('generator_id').notNull(),
  taskName: text('task_name').notNull(),
  description: text('description'),
  triggerType: text('trigger_type').notNull(), // 'hours' | 'calendar' | 'whichever_first'
  triggerHoursInterval: real('trigger_hours_interval'),
  triggerCalendarDays: integer('trigger_calendar_days'),
  isOneTime: integer('is_one_time').notNull(),
  createdAt: textTimestamp('created_at')
})

export type MaintenanceTemplate = typeof maintenanceTemplates.$inferSelect

export const maintenanceRecords = sqliteTable('maintenance_records', {
  id: textId(),
  templateId: text('template_id').notNull(),
  generatorId: text('generator_id').notNull(),
  performedByUserId: text('performed_by_user_id').notNull(),
  performedAt: textTimestamp('performed_at'),
  notes: text('notes')
})

export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect
