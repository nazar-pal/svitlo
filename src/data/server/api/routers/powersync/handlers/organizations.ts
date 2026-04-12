import { eq } from 'drizzle-orm'

import { updateOrganizationSchema } from '@/data/shared/validation'
import { organizations } from '@/data/server/db-schema'

import { replayShieldNotFound } from './replay'
import { transformSyncData } from '../transform'
import { fail, ok, type Insert, type TableHandler } from './types'

export const handleOrganizations: TableHandler = async ctx => {
  const { db, userId, op, id, data } = ctx
  const checks = ctx.checks.organizations

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof organizations>>(data)
    await db
      .insert(organizations)
      .values({ ...values, id, adminUserId: userId })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'update') {
    const shielded = replayShieldNotFound(
      await checks.renameOrganization(userId, id),
      'ORGANIZATION_NOT_FOUND'
    )
    if (shielded.status === 'consume') return shielded.result

    const parsed = updateOrganizationSchema.safeParse(
      transformSyncData<Partial<Insert<typeof organizations>>>(data)
    )
    if (!parsed.success)
      return fail(`Invalid organization update: ${parsed.error.message}`)
    const fields = parsed.data

    if (Object.keys(fields).length > 0)
      await db.update(organizations).set(fields).where(eq(organizations.id, id))

    return ok
  }

  if (op === 'delete') {
    const shielded = replayShieldNotFound(
      await checks.deleteOrganization(userId, id),
      'ORGANIZATION_NOT_FOUND'
    )
    if (shielded.status === 'consume') return shielded.result

    // Postgres FK constraints (`onDelete: 'cascade'` on
    // `generators.organizationId`, `organizationMembers.organizationId`,
    // `invitations.organizationId`, plus the maintenance chains below
    // `generators`) handle the cascade automatically — the client cascade
    // walk in the matching mutation is only needed because SQLite has no
    // FK constraints.
    await db.delete(organizations).where(eq(organizations.id, id))
    return ok
  }

  return fail('Invalid operation')
}
