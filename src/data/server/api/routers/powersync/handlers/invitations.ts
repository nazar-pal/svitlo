import { eq, sql } from 'drizzle-orm'

import { invitations, user } from '@/data/server/db-schema'

import { replayShieldAlreadyExists, replayShieldNotFound } from './replay'
import { transformSyncRow } from '../transform'
import { fail, ok, type Insert, type TableHandler } from './types'

export const handleInvitations: TableHandler = async ctx => {
  const { db, userId, userEmail, op, id, data } = ctx
  const checks = ctx.checks.invitations

  if (op === 'insert') {
    const values = transformSyncRow(invitations, data)
    const orgId = values.organizationId as string
    const inviteeEmail = values.inviteeEmail as string

    const shielded = replayShieldAlreadyExists(
      await checks.createInvitation(userId, orgId, inviteeEmail),
      'INVITATION_ALREADY_SENT'
    )
    if (shielded.status === 'consume') return shielded.result

    const existingUser = await db.query.user.findFirst({
      where: eq(sql`LOWER(${user.email})`, inviteeEmail.toLowerCase()),
      columns: { id: true }
    })

    await db
      .insert(invitations)
      .values({
        ...values,
        id,
        inviteeUserId: existingUser?.id ?? null
      } as Insert<typeof invitations>)
      .onConflictDoNothing()
    return ok
  }

  if (op === 'delete') {
    // Server accepts a delete from either an admin (cancel) or the invitee
    // (decline). Try cancel first — on any non-NOT_FOUND failure, fall back
    // to the decline path. Both branches ultimately DELETE the same row,
    // so whichever check approves is enough.
    const cancel = replayShieldNotFound(
      await checks.cancelInvitation(userId, id),
      'INVITATION_NOT_FOUND'
    )
    if (cancel.status === 'ok') {
      await db.delete(invitations).where(eq(invitations.id, id))
      return ok
    }
    // Replay path: row already gone, sync queue should advance silently.
    if (cancel.result.ok) return cancel.result

    const decline = await checks.declineInvitation(userEmail, id)
    if (!decline.ok) return fail(decline.code)

    await db.delete(invitations).where(eq(invitations.id, id))
    return ok
  }

  return fail('Invalid operation on invitations')
}
