import { timestamp, uuid } from 'drizzle-orm/pg-core'

export const uuidId = () => uuid('id').defaultRandom().primaryKey()

export const pgTimestamp = (name: string) =>
  timestamp(name, { withTimezone: true }).defaultNow().notNull()
