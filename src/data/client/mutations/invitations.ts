import { eq } from 'drizzle-orm'

import { invitations } from '@/data/client/db-schema'
import { invitationLifecycleChecks } from '@/data/client/invitations'
import {
  insertInvitationSchema,
  type InsertInvitationInput
} from '@/data/client/validation'
import { failFromZod } from '@/data/shared/errors-from-zod'
import { db, powersync } from '@/lib/powersync/database'

import { fail, newId, nowISO, ok, type MutationResult } from './helpers'

export async function createInvitation(
  userId: string,
  input: InsertInvitationInput
): Promise<MutationResult> {
  const parsed = insertInvitationSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)

  const check = await invitationLifecycleChecks.createInvitation(
    userId,
    parsed.data.organizationId,
    parsed.data.inviteeEmail
  )
  if (!check.ok) return fail(check.code)

  await db.insert(invitations).values({
    id: newId(),
    organizationId: parsed.data.organizationId,
    inviteeEmail: parsed.data.inviteeEmail,
    invitedByUserId: userId,
    createdAt: nowISO()
  })

  return ok
}

export async function acceptInvitation(
  userId: string,
  userEmail: string,
  invitationId: string
): Promise<MutationResult> {
  const check = await invitationLifecycleChecks.acceptInvitation(
    userId,
    userEmail,
    invitationId
  )
  if (!check.ok) return fail(check.code)

  await powersync.writeTransaction(async tx => {
    await tx.execute(
      'INSERT INTO organization_members (id, organization_id, user_id, joined_at) VALUES (?, ?, ?, ?)',
      [newId(), check.invitation.organizationId, userId, nowISO()]
    )
    await tx.execute('DELETE FROM invitations WHERE id = ?', [invitationId])
  })

  return ok
}

export async function declineInvitation(
  userEmail: string,
  invitationId: string
): Promise<MutationResult> {
  const check = await invitationLifecycleChecks.declineInvitation(
    userEmail,
    invitationId
  )
  if (!check.ok) return fail(check.code)

  await db.delete(invitations).where(eq(invitations.id, invitationId))

  return ok
}

export async function cancelInvitation(
  userId: string,
  invitationId: string
): Promise<MutationResult> {
  const check = await invitationLifecycleChecks.cancelInvitation(
    userId,
    invitationId
  )
  if (!check.ok) return fail(check.code)

  await db.delete(invitations).where(eq(invitations.id, invitationId))

  return ok
}
