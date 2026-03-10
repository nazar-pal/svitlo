import { relations } from 'drizzle-orm'
import { index, pgTable, text, unique, uuid } from 'drizzle-orm/pg-core'

import { user } from './auth'
import { pgTimestamp, uuidId } from './utils'

// ── Organizations ───────────────────────────────────────────────────────────

export const organizations = pgTable(
  'organizations',
  {
    id: uuidId(),
    name: text('name').notNull(),
    adminUserId: text('admin_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }),
    createdAt: pgTimestamp('created_at')
  },
  table => [index('organizations_admin_user_id_idx').on(table.adminUserId)]
)

export const organizationsRelations = relations(
  organizations,
  ({ one, many }) => ({
    admin: one(user, {
      fields: [organizations.adminUserId],
      references: [user.id]
    }),
    members: many(organizationMembers),
    invitations: many(invitations)
  })
)

// ── Organization Members ────────────────────────────────────────────────────

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuidId(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    joinedAt: pgTimestamp('joined_at')
  },
  table => [
    unique('organization_members_org_user_unique').on(
      table.organizationId,
      table.userId
    ),
    index('organization_members_user_id_idx').on(table.userId)
  ]
)

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.organizationId],
      references: [organizations.id]
    }),
    user: one(user, {
      fields: [organizationMembers.userId],
      references: [user.id]
    })
  })
)

// ── Invitations ─────────────────────────────────────────────────────────────

export const invitations = pgTable(
  'invitations',
  {
    id: uuidId(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    inviteeEmail: text('invitee_email').notNull(),
    createdAt: pgTimestamp('created_at')
  },
  table => [
    unique('invitations_org_email_unique').on(
      table.organizationId,
      table.inviteeEmail
    ),
    index('invitations_invitee_email_idx').on(table.inviteeEmail)
  ]
)

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id]
  })
}))
