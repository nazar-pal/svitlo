import { and, eq, sql } from 'drizzle-orm'

import {
  user as userTable,
  organizations,
  organizationMembers,
  invitations,
  generators,
  generatorUserAssignments,
  generatorSessions,
  maintenanceTemplates,
  maintenanceRecords
} from '@/data/server/db-schema'
import type { db } from '@/data/server'

import { transformSyncData } from './transform'

// ── Types ────────────────────────────────────────────────────────────────────

type Db = typeof db

export interface WriteContext {
  db: Db
  userId: string
  userEmail: string
  op: 'insert' | 'update' | 'delete'
  id: string
  data: Record<string, unknown>
}

type Result = { ok: true } | { ok: false; error: string }

type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert']

const ok: Result = { ok: true as const }
const deny = (reason: string): Result => ({ ok: false as const, error: reason })

// ── Auth helpers ─────────────────────────────────────────────────────────────

async function isOrgAdmin(db: Db, userId: string, orgId: string) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { adminUserId: true }
  })
  return org?.adminUserId === userId
}

async function getGeneratorOrgId(db: Db, generatorId: string) {
  const gen = await db.query.generators.findFirst({
    where: eq(generators.id, generatorId),
    columns: { organizationId: true }
  })
  return gen?.organizationId ?? null
}

async function isGeneratorOrgAdmin(
  db: Db,
  userId: string,
  generatorId: string
) {
  const orgId = await getGeneratorOrgId(db, generatorId)
  if (!orgId) return false
  return isOrgAdmin(db, userId, orgId)
}

async function canAccessGenerator(db: Db, userId: string, generatorId: string) {
  const orgId = await getGeneratorOrgId(db, generatorId)
  if (!orgId) return false

  if (await isOrgAdmin(db, userId, orgId)) return true

  const assignment = await db.query.generatorUserAssignments.findFirst({
    where: and(
      eq(generatorUserAssignments.generatorId, generatorId),
      eq(generatorUserAssignments.userId, userId)
    ),
    columns: { id: true }
  })
  return !!assignment
}

/**
 * Transfer a departing member's generator assignments to the org admin,
 * then delete the membership.
 */
async function transferAssignmentsAndRemoveMember(
  db: Db,
  adminUserId: string,
  member: { organizationId: string; userId: string },
  memberId: string
) {
  const assignments = await db
    .select({ generatorId: generatorUserAssignments.generatorId })
    .from(generatorUserAssignments)
    .innerJoin(
      generators,
      eq(generatorUserAssignments.generatorId, generators.id)
    )
    .where(
      and(
        eq(generatorUserAssignments.userId, member.userId),
        eq(generators.organizationId, member.organizationId)
      )
    )

  for (const a of assignments) {
    await db
      .delete(generatorUserAssignments)
      .where(
        and(
          eq(generatorUserAssignments.generatorId, a.generatorId),
          eq(generatorUserAssignments.userId, member.userId)
        )
      )

    await db
      .insert(generatorUserAssignments)
      .values({
        generatorId: a.generatorId,
        userId: adminUserId,
        assignedAt: new Date()
      })
      .onConflictDoNothing()
  }

  await db
    .delete(organizationMembers)
    .where(eq(organizationMembers.id, memberId))
}

// ── Per-table handlers ───────────────────────────────────────────────────────

export async function handleUser(ctx: WriteContext): Promise<Result> {
  const { db, userId, op, id, data } = ctx

  if (op !== 'update') return deny('Only updates allowed on user')
  if (id !== userId) return deny('Cannot update another user')

  const allowedFields: Record<string, unknown> = {}
  if (typeof data.name === 'string') allowedFields.name = data.name
  if (typeof data.image === 'string' || data.image === null)
    allowedFields.image = data.image

  if (Object.keys(allowedFields).length > 0)
    await db.update(userTable).set(allowedFields).where(eq(userTable.id, id))

  return ok
}

export async function handleOrganizations(ctx: WriteContext): Promise<Result> {
  const { db, userId, op, id, data } = ctx

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof organizations>>(data)
    await db
      .insert(organizations)
      .values({ ...values, id, adminUserId: userId })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'update') {
    if (!(await isOrgAdmin(db, userId, id)))
      return deny('Only admin can update organization')

    const fields: Record<string, unknown> = {}
    if (typeof data.name === 'string') fields.name = data.name

    if (Object.keys(fields).length > 0)
      await db.update(organizations).set(fields).where(eq(organizations.id, id))

    return ok
  }

  if (op === 'delete') {
    if (!(await isOrgAdmin(db, userId, id)))
      return deny('Only admin can delete organization')
    await db.delete(organizations).where(eq(organizations.id, id))
    return ok
  }

  return deny('Invalid operation')
}

export async function handleOrganizationMembers(
  ctx: WriteContext
): Promise<Result> {
  const { db, userId, userEmail, op, id, data } = ctx

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof organizationMembers>>(data)
    const orgId = values.organizationId as string
    const memberUserId = values.userId as string

    // Admin adding an employee
    if (await isOrgAdmin(db, userId, orgId)) {
      await db
        .insert(organizationMembers)
        .values({ ...values, id })
        .onConflictDoNothing()
      return ok
    }

    // User accepting their own invitation
    if (memberUserId === userId) {
      const invitation = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.organizationId, orgId),
          eq(sql`LOWER(${invitations.inviteeEmail})`, userEmail.toLowerCase())
        ),
        columns: { id: true }
      })
      if (!invitation)
        return deny('No pending invitation for this organization')

      await db
        .insert(organizationMembers)
        .values({ ...values, id })
        .onConflictDoNothing()
      await db.delete(invitations).where(eq(invitations.id, invitation.id))
      return ok
    }

    return deny('Not authorized to add members')
  }

  if (op === 'delete') {
    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, id),
      columns: { organizationId: true, userId: true }
    })
    if (!member) return ok // already deleted

    // Admin removing a member
    if (await isOrgAdmin(db, userId, member.organizationId)) {
      await transferAssignmentsAndRemoveMember(db, userId, member, id)
      return ok
    }

    // Member leaving on their own
    if (member.userId === userId) {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, member.organizationId),
        columns: { adminUserId: true }
      })
      if (!org) return deny('Organization not found')

      await transferAssignmentsAndRemoveMember(db, org.adminUserId, member, id)
      return ok
    }

    return deny('Not authorized to remove members')
  }

  return deny('Invalid operation on organization_members')
}

export async function handleInvitations(ctx: WriteContext): Promise<Result> {
  const { db, userId, userEmail, op, id, data } = ctx

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof invitations>>(data)
    const orgId = values.organizationId as string
    if (!(await isOrgAdmin(db, userId, orgId)))
      return deny('Only admin can create invitations')

    await db
      .insert(invitations)
      .values({ ...values, id })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'delete') {
    const invitation = await db.query.invitations.findFirst({
      where: eq(invitations.id, id),
      columns: { organizationId: true, inviteeEmail: true }
    })
    if (!invitation) return ok // already deleted

    // Admin canceling
    if (await isOrgAdmin(db, userId, invitation.organizationId)) {
      await db.delete(invitations).where(eq(invitations.id, id))
      return ok
    }

    // Invitee declining (email match)
    if (invitation.inviteeEmail.toLowerCase() === userEmail.toLowerCase()) {
      await db.delete(invitations).where(eq(invitations.id, id))
      return ok
    }

    return deny('Not authorized to delete this invitation')
  }

  return deny('Invalid operation on invitations')
}

export async function handleGenerators(ctx: WriteContext): Promise<Result> {
  const { db, userId, op, id, data } = ctx

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof generators>>(data)
    const orgId = values.organizationId as string
    if (!(await isOrgAdmin(db, userId, orgId)))
      return deny('Only admin can create generators')

    await db
      .insert(generators)
      .values({ ...values, id })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'update') {
    if (!(await isGeneratorOrgAdmin(db, userId, id)))
      return deny('Only admin can update generators')

    const fields = transformSyncData<Partial<Insert<typeof generators>>>(data)
    if (Object.keys(fields).length > 0)
      await db.update(generators).set(fields).where(eq(generators.id, id))

    return ok
  }

  if (op === 'delete') {
    if (!(await isGeneratorOrgAdmin(db, userId, id)))
      return deny('Only admin can delete generators')
    await db.delete(generators).where(eq(generators.id, id))
    return ok
  }

  return deny('Invalid operation')
}

export async function handleGeneratorUserAssignments(
  ctx: WriteContext
): Promise<Result> {
  const { db, userId, op, id, data } = ctx

  if (op === 'insert') {
    const values =
      transformSyncData<Insert<typeof generatorUserAssignments>>(data)
    const generatorId = values.generatorId as string
    if (!(await isGeneratorOrgAdmin(db, userId, generatorId)))
      return deny('Only admin can assign users to generators')

    await db
      .insert(generatorUserAssignments)
      .values({ ...values, id })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'delete') {
    const assignment = await db.query.generatorUserAssignments.findFirst({
      where: eq(generatorUserAssignments.id, id),
      columns: { generatorId: true }
    })
    if (!assignment) return ok

    if (!(await isGeneratorOrgAdmin(db, userId, assignment.generatorId)))
      return deny('Only admin can remove generator assignments')

    await db
      .delete(generatorUserAssignments)
      .where(eq(generatorUserAssignments.id, id))
    return ok
  }

  return deny('Invalid operation on generator_user_assignments')
}

export async function handleGeneratorSessions(
  ctx: WriteContext
): Promise<Result> {
  const { db, userId, op, id, data } = ctx

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof generatorSessions>>(data)
    const generatorId = values.generatorId as string
    if (!(await canAccessGenerator(db, userId, generatorId)))
      return deny('Not authorized for this generator')

    await db
      .insert(generatorSessions)
      .values({ ...values, id, startedByUserId: userId })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'update') {
    const session = await db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, id),
      columns: { generatorId: true }
    })
    if (!session) return deny('Session not found')

    if (!(await canAccessGenerator(db, userId, session.generatorId)))
      return deny('Not authorized for this generator')

    // Only stoppedAt and stoppedByUserId are updatable; userId is server-enforced
    const fields: Partial<Insert<typeof generatorSessions>> = {}
    if ('stopped_by_user_id' in data) fields.stoppedByUserId = userId
    if ('stopped_at' in data)
      fields.stoppedAt = data.stopped_at
        ? new Date(data.stopped_at as string)
        : null

    if (Object.keys(fields).length > 0)
      await db
        .update(generatorSessions)
        .set(fields)
        .where(eq(generatorSessions.id, id))

    return ok
  }

  if (op === 'delete') {
    const session = await db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, id),
      columns: { generatorId: true, startedByUserId: true }
    })
    if (!session) return ok

    const isAdmin = await isGeneratorOrgAdmin(db, userId, session.generatorId)
    if (!isAdmin) {
      if (!(await canAccessGenerator(db, userId, session.generatorId)))
        return deny('Not authorized for this generator')
      if (session.startedByUserId !== userId)
        return deny('Can only delete your own sessions')
    }

    await db.delete(generatorSessions).where(eq(generatorSessions.id, id))
    return ok
  }

  return deny('Invalid operation on generator_sessions')
}

export async function handleMaintenanceTemplates(
  ctx: WriteContext
): Promise<Result> {
  const { db, userId, op, id, data } = ctx

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof maintenanceTemplates>>(data)
    const generatorId = values.generatorId as string
    if (!(await isGeneratorOrgAdmin(db, userId, generatorId)))
      return deny('Only admin can create maintenance templates')

    await db
      .insert(maintenanceTemplates)
      .values({ ...values, id })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'update') {
    const template = await db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, id),
      columns: { generatorId: true }
    })
    if (!template) return deny('Template not found')

    if (!(await isGeneratorOrgAdmin(db, userId, template.generatorId)))
      return deny('Only admin can update maintenance templates')

    const fields =
      transformSyncData<Partial<Insert<typeof maintenanceTemplates>>>(data)
    if (Object.keys(fields).length > 0)
      await db
        .update(maintenanceTemplates)
        .set(fields)
        .where(eq(maintenanceTemplates.id, id))

    return ok
  }

  if (op === 'delete') {
    const template = await db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, id),
      columns: { generatorId: true }
    })
    if (!template) return ok

    if (!(await isGeneratorOrgAdmin(db, userId, template.generatorId)))
      return deny('Only admin can delete maintenance templates')

    await db.delete(maintenanceTemplates).where(eq(maintenanceTemplates.id, id))
    return ok
  }

  return deny('Invalid operation')
}

export async function handleMaintenanceRecords(
  ctx: WriteContext
): Promise<Result> {
  const { db, userId, op, id, data } = ctx

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof maintenanceRecords>>(data)
    const generatorId = values.generatorId as string
    if (!(await canAccessGenerator(db, userId, generatorId)))
      return deny('Not authorized for this generator')

    await db
      .insert(maintenanceRecords)
      .values({ ...values, id, performedByUserId: userId })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'update') {
    const record = await db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, id),
      columns: { generatorId: true }
    })
    if (!record) return deny('Record not found')

    if (!(await canAccessGenerator(db, userId, record.generatorId)))
      return deny('Not authorized for this generator')

    // Only notes is updatable
    const fields: Partial<Insert<typeof maintenanceRecords>> = {}
    if ('notes' in data)
      fields.notes = data.notes == null ? null : String(data.notes)

    if (Object.keys(fields).length > 0)
      await db
        .update(maintenanceRecords)
        .set(fields)
        .where(eq(maintenanceRecords.id, id))

    return ok
  }

  if (op === 'delete') {
    const record = await db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, id),
      columns: { generatorId: true, performedByUserId: true }
    })
    if (!record) return ok

    const isAdmin = await isGeneratorOrgAdmin(db, userId, record.generatorId)
    if (!isAdmin) {
      if (!(await canAccessGenerator(db, userId, record.generatorId)))
        return deny('Not authorized for this generator')
      if (record.performedByUserId !== userId)
        return deny('Can only delete your own maintenance records')
    }

    await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, id))
    return ok
  }

  return deny('Invalid operation on maintenance_records')
}
