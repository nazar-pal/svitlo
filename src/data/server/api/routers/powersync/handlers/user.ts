import { eq } from 'drizzle-orm'

import { user as userTable } from '@/data/server/db-schema'

import { fail, ok, type TableHandler } from './types'

export const handleUser: TableHandler = async ctx => {
  const { db, userId, op, id, data } = ctx

  if (op !== 'update') return fail('Only updates allowed on user')
  if (id !== userId) return fail('Cannot update another user')

  const allowedFields: Record<string, unknown> = {}
  if (typeof data.name === 'string') allowedFields.name = data.name
  if (typeof data.image === 'string' || data.image === null)
    allowedFields.image = data.image

  if (Object.keys(allowedFields).length > 0)
    await db.update(userTable).set(allowedFields).where(eq(userTable.id, id))

  return ok
}
