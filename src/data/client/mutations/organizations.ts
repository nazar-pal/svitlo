import { and, eq } from 'drizzle-orm'

import {
  invitations,
  organizationMembers,
  organizations
} from '@/data/client/db-schema'
import {
  insertInvitationSchema,
  insertOrganizationSchema,
  updateOrganizationSchema,
  type InsertInvitationInput,
  type InsertOrganizationInput,
  type UpdateOrganizationInput
} from '@/data/client/validation'
import { db, powersync } from '@/lib/powersync/database'

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
  const [invitation] = await db
    .select()
    .from(invitations)
    .where(eq(invitations.id, invitationId))
    .limit(1)

  if (!invitation) return fail('Invitation not found')
  if (invitation.inviteeEmail.toLowerCase() !== userEmail.toLowerCase())
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
  if (invitation.inviteeEmail.toLowerCase() !== userEmail.toLowerCase())
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

export async function renameOrganization(
  userId: string,
  orgId: string,
  input: UpdateOrganizationInput
): Promise<MutationResult> {
  const parsed = updateOrganizationSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0].message)

  if (!(await isOrgAdmin(userId, orgId)))
    return fail('Only admin can rename organization')

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
    return fail('Only admin can delete organization')

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
