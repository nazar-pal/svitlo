import { relations, sql } from 'drizzle-orm'
import {
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'

import { user } from './auth'
import { organizations } from './organizations'
import { pgTimestamp, uuidId } from './utils'

// ── Generators ──────────────────────────────────────────────────────────────

export const generators = pgTable(
  'generators',
  {
    id: uuidId(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    model: text('model').notNull(),
    description: text('description'),
    maxConsecutiveRunHours: real('max_consecutive_run_hours').notNull(),
    requiredRestHours: real('required_rest_hours').notNull(),
    runWarningThresholdPct: integer('run_warning_threshold_pct')
      .default(80)
      .notNull(),
    createdAt: pgTimestamp('created_at')
  },
  table => [index('generators_organization_id_idx').on(table.organizationId)]
)

export const generatorsRelations = relations(generators, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [generators.organizationId],
    references: [organizations.id]
  }),
  assignments: many(generatorUserAssignments),
  sessions: many(generatorSessions)
}))

// ── Generator User Assignments ──────────────────────────────────────────────

export const generatorUserAssignments = pgTable(
  'generator_user_assignments',
  {
    id: uuidId(),
    generatorId: uuid('generator_id')
      .notNull()
      .references(() => generators.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    assignedAt: pgTimestamp('assigned_at')
  },
  table => [
    unique('generator_user_assignments_generator_user_unique').on(
      table.generatorId,
      table.userId
    )
  ]
)

export const generatorUserAssignmentsRelations = relations(
  generatorUserAssignments,
  ({ one }) => ({
    generator: one(generators, {
      fields: [generatorUserAssignments.generatorId],
      references: [generators.id]
    }),
    user: one(user, {
      fields: [generatorUserAssignments.userId],
      references: [user.id]
    })
  })
)

// ── Generator Sessions ──────────────────────────────────────────────────────

export const generatorSessions = pgTable(
  'generator_sessions',
  {
    id: uuidId(),
    generatorId: uuid('generator_id')
      .notNull()
      .references(() => generators.id, { onDelete: 'cascade' }),
    // onDelete default (no action) — intentional: preserves audit trail,
    // prevents deleting users with session history. Use soft-delete instead.
    startedByUserId: text('started_by_user_id')
      .notNull()
      .references(() => user.id),
    stoppedByUserId: text('stopped_by_user_id').references(() => user.id),
    startedAt: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    stoppedAt: timestamp('stopped_at', { withTimezone: true })
  },
  table => [
    index('generator_sessions_generator_id_idx').on(table.generatorId),
    uniqueIndex('generator_sessions_one_active_per_generator')
      .on(table.generatorId)
      .where(sql`"stopped_at" IS NULL`)
  ]
)

export const generatorSessionsRelations = relations(
  generatorSessions,
  ({ one }) => ({
    generator: one(generators, {
      fields: [generatorSessions.generatorId],
      references: [generators.id]
    }),
    startedByUser: one(user, {
      fields: [generatorSessions.startedByUserId],
      references: [user.id],
      relationName: 'startedBy'
    }),
    stoppedByUser: one(user, {
      fields: [generatorSessions.stoppedByUserId],
      references: [user.id],
      relationName: 'stoppedBy'
    })
  })
)
