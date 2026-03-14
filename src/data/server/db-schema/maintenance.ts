import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  uuid
} from 'drizzle-orm/pg-core'

import { user } from './auth'
import { generators } from './generators'
import { pgTimestamp, uuidId } from './utils'

// ── Enums ───────────────────────────────────────────────────────────────────

export const triggerTypeEnum = pgEnum('trigger_type', [
  'hours',
  'calendar',
  'whichever_first'
])

// ── Maintenance Templates ───────────────────────────────────────────────────

export const maintenanceTemplates = pgTable(
  'maintenance_templates',
  {
    id: uuidId(),
    generatorId: uuid('generator_id')
      .notNull()
      .references(() => generators.id, { onDelete: 'cascade' }),
    taskName: text('task_name').notNull(),
    description: text('description'),
    triggerType: triggerTypeEnum('trigger_type').notNull(),
    triggerHoursInterval: real('trigger_hours_interval'),
    triggerCalendarDays: integer('trigger_calendar_days'),
    isOneTime: boolean('is_one_time').default(false).notNull(),
    createdAt: pgTimestamp('created_at')
  },
  table => [
    index('maintenance_templates_generator_id_idx').on(table.generatorId)
  ]
)

export const maintenanceTemplatesRelations = relations(
  maintenanceTemplates,
  ({ one, many }) => ({
    generator: one(generators, {
      fields: [maintenanceTemplates.generatorId],
      references: [generators.id]
    }),
    records: many(maintenanceRecords)
  })
)

// ── Maintenance Records ─────────────────────────────────────────────────────

export const maintenanceRecords = pgTable(
  'maintenance_records',
  {
    id: uuidId(),
    templateId: uuid('template_id')
      .notNull()
      .references(() => maintenanceTemplates.id, { onDelete: 'cascade' }),
    generatorId: uuid('generator_id')
      .notNull()
      .references(() => generators.id, { onDelete: 'cascade' }),
    // onDelete default (no action) — intentional: preserves audit trail
    performedByUserId: text('performed_by_user_id')
      .notNull()
      .references(() => user.id),
    performedAt: pgTimestamp('performed_at'),
    notes: text('notes')
  },
  table => [
    index('maintenance_records_generator_id_idx').on(table.generatorId),
    index('maintenance_records_template_id_idx').on(table.templateId)
  ]
)

export const maintenanceRecordsRelations = relations(
  maintenanceRecords,
  ({ one }) => ({
    template: one(maintenanceTemplates, {
      fields: [maintenanceRecords.templateId],
      references: [maintenanceTemplates.id]
    }),
    generator: one(generators, {
      fields: [maintenanceRecords.generatorId],
      references: [generators.id]
    }),
    performedByUser: one(user, {
      fields: [maintenanceRecords.performedByUserId],
      references: [user.id]
    })
  })
)
