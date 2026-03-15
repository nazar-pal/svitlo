import { eq } from 'drizzle-orm'

import { user } from '../db-schema'
import { db } from '@/lib/powersync/database'

export function getAllUsers() {
  return db.select().from(user)
}

interface GetUserParams {
  userId: string
}

export function getUser({ userId }: GetUserParams) {
  return db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: {
      createdAt: false,
      updatedAt: false
    }
  })
}

export type GetUserResult = Awaited<ReturnType<typeof getUser>>
export type GetUserResultItem = Exclude<GetUserResult, undefined>
