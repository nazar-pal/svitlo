import { eq } from 'drizzle-orm'

import {
  insertGeneratorSchema,
  updateGeneratorSchema
} from '@/data/shared/validation'
import { generators } from '@/data/server/db-schema'

import { replayShieldNotFound } from './replay'
import { transformSyncData } from '../transform'
import { fail, ok, type Insert, type TableHandler } from './types'

export const handleGenerators: TableHandler = async ctx => {
  const { db, userId, op, id, data } = ctx
  const checks = ctx.checks.generators

  if (op === 'insert') {
    // Transform the snake_case wire shape into camelCase + proper types,
    // then Zod-validate. The schema acts as a field whitelist — any unknown
    // key a compromised client sends gets stripped here instead of reaching
    // Drizzle.
    const transformed = transformSyncData<Insert<typeof generators>>(data)
    const parsed = insertGeneratorSchema.safeParse(transformed)
    if (!parsed.success)
      return fail(`Invalid generator insert: ${parsed.error.message}`)

    const result = await checks.createGenerator(
      userId,
      parsed.data.organizationId
    )
    if (!result.ok) return fail(result.code)

    await db
      .insert(generators)
      .values({ ...parsed.data, id })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'update') {
    const transformed =
      transformSyncData<Partial<Insert<typeof generators>>>(data)
    const parsed = updateGeneratorSchema.safeParse(transformed)
    if (!parsed.success)
      return fail(`Invalid generator update: ${parsed.error.message}`)

    const result = await checks.updateGenerator(userId, id)
    if (!result.ok) return fail(result.code)

    if (Object.keys(parsed.data).length > 0)
      await db.update(generators).set(parsed.data).where(eq(generators.id, id))

    return ok
  }

  if (op === 'delete') {
    const shielded = replayShieldNotFound(
      await checks.deleteGenerator(userId, id),
      'GENERATOR_NOT_FOUND'
    )
    if (shielded.status === 'consume') return shielded.result

    await db.delete(generators).where(eq(generators.id, id))
    return ok
  }

  return fail('Invalid operation')
}
