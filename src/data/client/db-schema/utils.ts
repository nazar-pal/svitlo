import { text } from 'drizzle-orm/sqlite-core'

export const textId = () => text('id').primaryKey()

export const textTimestamp = (name: string) => text(name).notNull()
