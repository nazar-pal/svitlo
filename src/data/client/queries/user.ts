import { eq } from 'drizzle-orm'

import { user } from '../db-schema'
import { db } from '@/lib/powersync/database'

export function getAllUsers() {
  return db.select().from(user)
}

export function getUserById(id: string) {
  return db.query.user.findFirst({
    where: eq(user.id, id),
    columns: {
      createdAt: false,
      updatedAt: false
    }
  })
}
