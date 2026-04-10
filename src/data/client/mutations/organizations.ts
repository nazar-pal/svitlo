import { eq } from 'drizzle-orm'

import { isOrgAdmin } from '@/data/client/authz'
import {
  invitations,
  organizationMembers,
  organizations
} from '@/data/client/db-schema'
import {
  getInvitationById,
  getInvitationByOrgAndEmail,
  getOrgMemberById
} from '@/data/client/queries'
import { failFromZod } from '@/data/shared/errors-from-zod'
import {
  insertInvitationSchema,
  insertOrganizationSchema,
  updateOrganizationSchema,
  type InsertInvitationInput,
  type InsertOrganizationInput,
  type UpdateOrganizationInput
} from '@/data/client/validation'
import { db, powersync } from '@/lib/powersync/database'

import { fail, newId, nowISO, ok, type MutationResult } from './helpers'

export async function createOrganization(
  userId: string,
  input: InsertOrganizationInput
): Promise<MutationResult> {
  const parsed = insertOrganizationSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)

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
  if (!parsed.success) return failFromZod(parsed.error)

  if (!(await isOrgAdmin(userId, parsed.data.organizationId)))
    return fail('ONLY_ADMIN_CAN_INVITE')

  const existing = await getInvitationByOrgAndEmail(
    parsed.data.organizationId,
    parsed.data.inviteeEmail
  )
  if (existing) return fail('INVITATION_ALREADY_SENT')

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
  const invitation = await getInvitationById(invitationId)

  if (!invitation) return fail('INVITATION_NOT_FOUND')
  if (invitation.inviteeEmail.toLowerCase() !== userEmail.toLowerCase())
    return fail('INVITATION_NOT_FOR_YOU')

  const existing = await getOrgMemberById(userId, invitation.organizationId)
  if (existing) return fail('ALREADY_MEMBER')

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
  const invitation = await getInvitationById(invitationId)

  if (!invitation) return fail('INVITATION_NOT_FOUND')
  if (invitation.inviteeEmail.toLowerCase() !== userEmail.toLowerCase())
    return fail('INVITATION_NOT_FOR_YOU')

  await db.delete(invitations).where(eq(invitations.id, invitationId))

  return ok
}

export async function cancelInvitation(
  userId: string,
  invitationId: string
): Promise<MutationResult> {
  const invitation = await getInvitationById(invitationId)

  if (!invitation) return fail('INVITATION_NOT_FOUND')

  if (!(await isOrgAdmin(userId, invitation.organizationId)))
    return fail('ONLY_ADMIN_CAN_CANCEL_INVITATIONS')

  await db.delete(invitations).where(eq(invitations.id, invitationId))

  return ok
}

export async function renameOrganization(
  userId: string,
  orgId: string,
  input: UpdateOrganizationInput
): Promise<MutationResult> {
  const parsed = updateOrganizationSchema.safeParse(input)
  if (!parsed.success) return failFromZod(parsed.error)

  if (!(await isOrgAdmin(userId, orgId)))
    return fail('ONLY_ADMIN_CAN_RENAME_ORG')

  await db
    .update(organizations)
    .set({ name: parsed.data.name })
    .where(eq(organizations.id, orgId))

  return ok
}

export async function deleteOrganization(
  userId: string,
  orgId: string
): Promise<MutationResult> {
  if (!(await isOrgAdmin(userId, orgId)))
    return fail('ONLY_ADMIN_CAN_DELETE_ORG')

  await powersync.writeTransaction(async tx => {
    // Cascade delete leaves-first (client SQLite has no FK constraints)
    await tx.execute(
      'DELETE FROM maintenance_records WHERE generator_id IN (SELECT id FROM generators WHERE organization_id = ?)',
      [orgId]
    )
    await tx.execute(
      'DELETE FROM maintenance_templates WHERE generator_id IN (SELECT id FROM generators WHERE organization_id = ?)',
      [orgId]
    )
    await tx.execute(
      'DELETE FROM generator_sessions WHERE generator_id IN (SELECT id FROM generators WHERE organization_id = ?)',
      [orgId]
    )
    await tx.execute(
      'DELETE FROM generator_user_assignments WHERE generator_id IN (SELECT id FROM generators WHERE organization_id = ?)',
      [orgId]
    )
    await tx.execute('DELETE FROM generators WHERE organization_id = ?', [
      orgId
    ])
    await tx.execute('DELETE FROM invitations WHERE organization_id = ?', [
      orgId
    ])
    await tx.execute(
      'DELETE FROM organization_members WHERE organization_id = ?',
      [orgId]
    )
    await tx.execute('DELETE FROM organizations WHERE id = ?', [orgId])
  })

  return ok
}
