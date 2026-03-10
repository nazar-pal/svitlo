import { and, eq } from 'drizzle-orm'

import {
  invitations,
  organizationMembers,
  organizations
} from '@/data/client/db-schema'
import {
  insertInvitationSchema,
  insertOrganizationSchema,
  type InsertInvitationInput,
  type InsertOrganizationInput
} from '@/data/client/validation'
import { db } from '@/lib/powersync/database'

import {
  fail,
  isOrgAdmin,
  newId,
  nowISO,
  ok,
  type MutationResult
} from './helpers'

export async function createOrganization(
  userId: string,
  input: InsertOrganizationInput
): Promise<MutationResult> {
  const parsed = insertOrganizationSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  await db.insert(organizations).values({
    id: newId(),
    name: parsed.data.name,
    adminUserId: userId,
    createdAt: nowISO()
  })

  return ok
}

export async function createInvitation(
  userId: string,
  input: InsertInvitationInput
): Promise<MutationResult> {
  const parsed = insertInvitationSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  if (!(await isOrgAdmin(userId, parsed.data.organizationId)))
    return fail('Only admin can invite')

  // Check no duplicate invitation
  const [existing] = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, parsed.data.organizationId),
        eq(invitations.inviteeEmail, parsed.data.inviteeEmail)
      )
    )
    .limit(1)

  if (existing) return fail('Invitation already sent to this email')

  await db.insert(invitations).values({
    id: newId(),
    organizationId: parsed.data.organizationId,
    inviteeEmail: parsed.data.inviteeEmail,
    createdAt: nowISO()
  })

  return ok
}

export async function acceptInvitation(
  userId: string,
  userEmail: string,
  invitationId: string
): Promise<MutationResult> {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1)

  if (!invitation) return fail('Invitation not found')
  if (invitation.inviteeEmail !== userEmail)
    return fail('This invitation is not for you')

  // Check not already a member
  const [existing] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, invitation.organizationId),
        eq(organizationMembers.userId, userId)
      )
    )
    .limit(1)

  if (existing) return fail('Already a member of this organization')

  // Insert member and delete invitation
  await db.insert(organizationMembers).values({
    id: newId(),
    organizationId: invitation.organizationId,
    userId,
    joinedAt: nowISO()
  })

  await db.delete(invitations).where(eq(invitations.id, invitationId))

  return ok
}

export async function declineInvitation(
  userEmail: string,
  invitationId: string
): Promise<MutationResult> {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1)

  if (!invitation) return fail('Invitation not found')
  if (invitation.inviteeEmail !== userEmail)
    return fail('This invitation is not for you')

  await db.delete(invitations).where(eq(invitations.id, invitationId))

  return ok
}

export async function cancelInvitation(
  userId: string,
  invitationId: string
): Promise<MutationResult> {
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1)

  if (!invitation) return fail('Invitation not found')

  if (!(await isOrgAdmin(userId, invitation.organizationId)))
    return fail('Only admin can cancel invitations')

  await db.delete(invitations).where(eq(invitations.id, invitationId))

  return ok
}
