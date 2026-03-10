import { db } from '@/lib/powersync/database'
import { eq } from 'drizzle-orm'
import { user } from '../db-schema'

interface Params {
  userId: string
}

export function getUser({ userId }: Params) {
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
