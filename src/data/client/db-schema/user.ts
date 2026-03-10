import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { textId, textTimestamp } from './utils'

export const user = sqliteTable('user', {
  id: textId(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  emailVerified: integer('email_verified').notNull().default(0), // 0/1
  image: text('image'),
  createdAt: textTimestamp('created_at'),
  updatedAt: textTimestamp('updated_at')
})

export type User = typeof user.$inferSelect
