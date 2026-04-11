import { eq } from 'drizzle-orm'

import { isOrgAdmin } from '@/data/client/authz'
import { invitations, organizations } from '@/data/client/db-schema'
import { invitationLifecycleChecks } from '@/data/client/invitations'
import {
  insertInvitationSchema,
  insertOrganizationSchema,
  updateOrganizationSchema,
  type InsertInvitationInput,
  type InsertOrganizationInput,
  type UpdateOrganizationInput
} from '@/data/client/validation'
import { failFromZod } from '@/data/shared/errors-from-zod'
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
