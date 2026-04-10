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
import { createServerAuthz } from '@/data/server/authz'
import { createServerGeneratorChecks } from '@/data/server/generators'
import { createServerSessionChecks } from '@/data/server/sessions'
import {
  insertGeneratorSchema,
  updateGeneratorSchema
} from '@/data/client/validation'

import { transformSyncData } from './transform'

// ── Types ────────────────────────────────────────────────────────────────────

// Local to this file: server-side handlers return free-form string errors
// that flow back through the PowerSync wire contract for connector-side
// logging. These are developer/audit messages, not user-facing strings —
// the client-facing structured `MutationError` contract lives in
// `@/data/shared/errors.ts` and is used only by client mutations.
type MutationResult = { ok: true } | { ok: false; error: string }

const ok: MutationResult = { ok: true }
const fail = (error: string): MutationResult => ({ ok: false, error })

type Db = typeof db

export interface WriteContext {
  db: Db
  userId: string
  userEmail: string
  op: 'insert' | 'update' | 'delete'
  id: string
  data: Record<string, unknown>
}

type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert']

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

export async function handleUser(ctx: WriteContext): Promise<MutationResult> {
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

export async function handleOrganizations(
  ctx: WriteContext
): Promise<MutationResult> {
  const { db, userId, op, id, data } = ctx
  const authz = createServerAuthz(db)
  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof organizations>>(data)
    await db
      .insert(organizations)
      .values({ ...values, id, adminUserId: userId })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'update') {
    if (!(await authz.isOrgAdmin(userId, id)))
      return fail('Only admin can update organization')

    const fields: Record<string, unknown> = {}
    if (typeof data.name === 'string') fields.name = data.name

    if (Object.keys(fields).length > 0)
      await db.update(organizations).set(fields).where(eq(organizations.id, id))

    return ok
  }

  if (op === 'delete') {
    if (!(await authz.isOrgAdmin(userId, id)))
      return fail('Only admin can delete organization')
    await db.delete(organizations).where(eq(organizations.id, id))
    return ok
  }

  return fail('Invalid operation')
}

export async function handleOrganizationMembers(
  ctx: WriteContext
): Promise<MutationResult> {
  const { db, userId, userEmail, op, id, data } = ctx
  const authz = createServerAuthz(db)

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof organizationMembers>>(data)
    const orgId = values.organizationId as string
    const memberUserId = values.userId as string

    // Admin adding an employee
    if (await authz.isOrgAdmin(userId, orgId)) {
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
        return fail('No pending invitation for this organization')

      await db
        .insert(organizationMembers)
        .values({ ...values, id })
        .onConflictDoNothing()
      await db.delete(invitations).where(eq(invitations.id, invitation.id))
      return ok
    }

    return fail('Not authorized to add members')
  }

  if (op === 'delete') {
    const member = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, id),
      columns: { organizationId: true, userId: true }
    })
    if (!member) return ok // already deleted

    // Admin removing a member
    if (await authz.isOrgAdmin(userId, member.organizationId)) {
      await transferAssignmentsAndRemoveMember(db, userId, member, id)
      return ok
    }

    // Member leaving on their own
    if (member.userId === userId) {
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, member.organizationId),
        columns: { adminUserId: true }
      })
      if (!org) return fail('Organization not found')

      await transferAssignmentsAndRemoveMember(db, org.adminUserId, member, id)
      return ok
    }

    return fail('Not authorized to remove members')
  }

  return fail('Invalid operation on organization_members')
}

export async function handleInvitations(
  ctx: WriteContext
): Promise<MutationResult> {
  const { db, userId, userEmail, op, id, data } = ctx
  const authz = createServerAuthz(db)

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof invitations>>(data)
    const orgId = values.organizationId as string
    if (!(await authz.isOrgAdmin(userId, orgId)))
      return fail('Only admin can create invitations')

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
    if (await authz.isOrgAdmin(userId, invitation.organizationId)) {
      await db.delete(invitations).where(eq(invitations.id, id))
      return ok
    }

    // Invitee declining (email match)
    if (invitation.inviteeEmail.toLowerCase() === userEmail.toLowerCase()) {
      await db.delete(invitations).where(eq(invitations.id, id))
      return ok
    }

    return fail('Not authorized to delete this invitation')
  }

  return fail('Invalid operation on invitations')
}

export async function handleGenerators(
  ctx: WriteContext
): Promise<MutationResult> {
  const { db, userId, op, id, data } = ctx
  const checks = createServerGeneratorChecks(db)

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
    // Same shape as insert: transform then Zod-whitelist the partial payload.
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
    const result = await checks.deleteGenerator(userId, id)
    if (!result.ok) {
      // Lost-ack replay: PowerSync may resend a delete whose ack was lost on
      // the wire. If the row is already gone, the shared policy returns
      // `GENERATOR_NOT_FOUND` — translate that into a server-side success so
      // the sync queue advances past the already-applied delete instead of
      // logging a spurious rejection. Mirrors `handleGeneratorSessions`'
      // `SESSION_NOT_FOUND → ok` principle.
      if (result.code === 'GENERATOR_NOT_FOUND') return ok
      return fail(result.code)
    }
    await db.delete(generators).where(eq(generators.id, id))
    return ok
  }

  return fail('Invalid operation')
}

export async function handleGeneratorUserAssignments(
  ctx: WriteContext
): Promise<MutationResult> {
  const { db, userId, op, id, data } = ctx
  const authz = createServerAuthz(db)

  if (op === 'insert') {
    const values =
      transformSyncData<Insert<typeof generatorUserAssignments>>(data)
    const generatorId = values.generatorId as string
    if (!(await authz.isGeneratorOrgAdmin(userId, generatorId)))
      return fail('Only admin can assign users to generators')

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

    if (!(await authz.isGeneratorOrgAdmin(userId, assignment.generatorId)))
      return fail('Only admin can remove generator assignments')

    await db
      .delete(generatorUserAssignments)
      .where(eq(generatorUserAssignments.id, id))
    return ok
  }

  return fail('Invalid operation on generator_user_assignments')
}

export async function handleGeneratorSessions(
  ctx: WriteContext
): Promise<MutationResult> {
  const { db, userId, op, id, data } = ctx
  const checks = createServerSessionChecks(db)

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof generatorSessions>>(data)
    const generatorId = values.generatorId as string

    const result = await checks.startSession(userId, generatorId)
    if (!result.ok) {
      // Lost-ack replay: PowerSync resends the same CRUD entry (same `id`,
      // same user) when the client never saw the original upload ack. When
      // that happens the replay trips `GENERATOR_ALREADY_ACTIVE` because
      // the first upload's open session is still there. If a row already
      // exists under this exact `id` and was started by the same user,
      // treat the replay as already-applied and return `ok` so the sync
      // queue advances silently — matching the delete handler's
      // `SESSION_NOT_FOUND → ok` principle and avoiding a spurious
      // user-facing rejection.
      if (result.code === 'GENERATOR_ALREADY_ACTIVE') {
        const existing = await db.query.generatorSessions.findFirst({
          where: eq(generatorSessions.id, id),
          columns: { startedByUserId: true }
        })
        if (existing && existing.startedByUserId === userId) return ok
      }
      return fail(result.code)
    }

    // Belt-and-braces: the policy's `hasOpenSessionForGenerator` check is
    // the primary guard against concurrent sessions, but a very late replay
    // (after the original session has since been stopped) could slip past
    // it and hit a PK conflict. `onConflictDoNothing` swallows that edge
    // case as a no-op instead of crashing the handler.
    await db
      .insert(generatorSessions)
      .values({ ...values, id, startedByUserId: userId })
      .onConflictDoNothing()
    return ok
  }

  if (op === 'update') {
    // Two wire shapes reach this branch:
    //   `stopSession`  → { stopped_at, stopped_by_user_id }
    //   `updateSession` → { started_at, stopped_at } (manual time edit)
    // `started_at` presence distinguishes the two.
    if ('started_at' in data) {
      const startedAt = data.started_at as string
      const stoppedAt = data.stopped_at as string
      const result = await checks.updateSession(
        userId,
        id,
        { startedAt, stoppedAt },
        new Date()
      )
      if (!result.ok) return fail(result.code)

      await db
        .update(generatorSessions)
        .set({
          startedAt: new Date(startedAt),
          stoppedAt: new Date(stoppedAt)
        })
        .where(eq(generatorSessions.id, id))
      return ok
    }

    const result = await checks.stopSession(userId, id)
    if (!result.ok) return fail(result.code)

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
    const result = await checks.deleteSession(userId, id)
    if (!result.ok) {
      // PowerSync replays writes whose ack was lost on the wire; translate
      // the shared policy's `SESSION_NOT_FOUND` into a server-side success
      // so the sync queue advances past the already-applied delete instead
      // of recording a spurious rejection. The client mutation keeps the
      // error (synchronous UX), hence the asymmetry between the two sides.
      if (result.code === 'SESSION_NOT_FOUND') return ok
      return fail(result.code)
    }

    // Server-only extra: non-admins may only delete their own sessions. The
    // shared policy allows any user with generator access, matching client
    // behaviour; the server layers an ownership rule on top as defence in
    // depth for the sync protocol. Reuse the session the policy already
    // fetched — no second `findSession` round trip.
    const authz = createServerAuthz(db)
    const isAdmin = await authz.isGeneratorOrgAdmin(
      userId,
      result.session.generatorId
    )
    if (!isAdmin && result.session.startedByUserId !== userId)
      return fail('Can only delete your own sessions')

    await db.delete(generatorSessions).where(eq(generatorSessions.id, id))
    return ok
  }

  return fail('Invalid operation on generator_sessions')
}

export async function handleMaintenanceTemplates(
  ctx: WriteContext
): Promise<MutationResult> {
  const { db, userId, op, id, data } = ctx
  const authz = createServerAuthz(db)

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof maintenanceTemplates>>(data)
    const generatorId = values.generatorId as string
    if (!(await authz.isGeneratorOrgAdmin(userId, generatorId)))
      return fail('Only admin can create maintenance templates')

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
    if (!template) return fail('Template not found')

    if (!(await authz.isGeneratorOrgAdmin(userId, template.generatorId)))
      return fail('Only admin can update maintenance templates')

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

    if (!(await authz.isGeneratorOrgAdmin(userId, template.generatorId)))
      return fail('Only admin can delete maintenance templates')

    await db.delete(maintenanceTemplates).where(eq(maintenanceTemplates.id, id))
    return ok
  }

  return fail('Invalid operation')
}

export async function handleMaintenanceRecords(
  ctx: WriteContext
): Promise<MutationResult> {
  const { db, userId, op, id, data } = ctx
  const authz = createServerAuthz(db)

  if (op === 'insert') {
    const values = transformSyncData<Insert<typeof maintenanceRecords>>(data)
    const generatorId = values.generatorId as string
    if (!(await authz.canAccessGenerator(userId, generatorId)))
      return fail('Not authorized for this generator')

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
    if (!record) return fail('Record not found')

    if (!(await authz.canAccessGenerator(userId, record.generatorId)))
      return fail('Not authorized for this generator')

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

    const isAdmin = await authz.isGeneratorOrgAdmin(userId, record.generatorId)
    if (!isAdmin) {
      if (!(await authz.canAccessGenerator(userId, record.generatorId)))
        return fail('Not authorized for this generator')
      if (record.performedByUserId !== userId)
        return fail('Can only delete your own maintenance records')
    }

    await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, id))
    return ok
  }

  return fail('Invalid operation on maintenance_records')
}
