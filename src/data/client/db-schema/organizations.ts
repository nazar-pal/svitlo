import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { textId, textTimestamp } from './utils'

export const organizations = sqliteTable('organizations', {
  id: textId(),
  name: text('name').notNull(),
  adminUserId: text('admin_user_id').notNull(),
  createdAt: textTimestamp('created_at')
})

export type Organization = typeof organizations.$inferSelect

export const organizationMembers = sqliteTable('organization_members', {
  id: textId(),
  organizationId: text('organization_id').notNull(),
  userId: text('user_id').notNull(),
  joinedAt: textTimestamp('joined_at')
})

export type OrganizationMember = typeof organizationMembers.$inferSelect

export const invitations = sqliteTable('invitations', {
  id: textId(),
  organizationId: text('organization_id').notNull(),
  inviteeEmail: text('invitee_email').notNull(),
  createdAt: textTimestamp('created_at')
})

export type Invitation = typeof invitations.$inferSelect
