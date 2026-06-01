import { and, eq, isNull, sql } from 'drizzle-orm'

import type { db as serverDb } from '@/data/server'
import {
  generators,
  generatorSessions,
  generatorUserAssignments,
  invitations,
  maintenanceRecords,
  maintenanceTemplates,
  organizationMembers,
  organizations
} from '@/data/server/db-schema'
import type { SessionRef } from '@/data/shared/sessions'
import type { TriggerType } from '@/lib/maintenance/trigger-type'

type Db = typeof serverDb

// Server-side fact registry. No reactive path here (Postgres is behind
// oRPC, not subscribed to), so resolvers are flat async functions. The
// fact-key namespace mirrors `@/data/client/registry.ts` so the same
// decision plan drives both sides.

type Resolver<Input, Output> = (db: Db, input: Input) => Promise<Output>

const sessionById: Resolver<string, SessionRef | null> = async (db, id) => {
  const row = await db.query.generatorSessions.findFirst({
    where: eq(generatorSessions.id, id),
    columns: {
      generatorId: true,
      startedByUserId: true,
      stoppedAt: true
    }
  })
  if (!row) return null
  return {
    generatorId: row.generatorId,
    startedByUserId: row.startedByUserId,
    isStopped: row.stoppedAt !== null
  }
}

const generatorById: Resolver<string, { id: string } | null> = async (
  db,
  id
) => {
  const row = await db.query.generators.findFirst({
    where: eq(generators.id, id),
    columns: { id: true }
  })
  return row ?? null
}

const sessionHasOpenForGenerator: Resolver<string, boolean> = async (
  db,
  generatorId
) => {
  const row = await db.query.generatorSessions.findFirst({
    where: and(
      eq(generatorSessions.generatorId, generatorId),
      isNull(generatorSessions.stoppedAt)
    ),
    columns: { id: true }
  })
  return row !== undefined
}

type GeneratorAuthzInput = { userId: string; generatorId: string }

const authzGenerator: Resolver<
  GeneratorAuthzInput,
  { orgAdminUserId: string | null; hasAssignment: boolean } | null
> = async (db, { userId, generatorId }) => {
  const [row] = await db
    .select({
      orgAdminUserId: organizations.adminUserId,
      hasAssignment: sql<boolean>`
        EXISTS (
          SELECT 1 FROM ${generatorUserAssignments}
          WHERE ${generatorUserAssignments.generatorId} = ${generators.id}
            AND ${generatorUserAssignments.userId} = ${userId}
        )
      `
    })
    .from(generators)
    .leftJoin(organizations, eq(generators.organizationId, organizations.id))
    .where(eq(generators.id, generatorId))
    .limit(1)

  if (!row) return null
  return {
    orgAdminUserId: row.orgAdminUserId,
    hasAssignment: row.hasAssignment === true
  }
}

const authzOrg: Resolver<
  string,
  { adminUserId: string | null } | null
> = async (db, orgId) => {
  const row = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { adminUserId: true }
  })
  return row ? { adminUserId: row.adminUserId } : null
}

const organizationById: Resolver<
  string,
  { id: string; adminUserId: string } | null
> = async (db, id) => {
  const row = await db.query.organizations.findFirst({
    where: eq(organizations.id, id),
    columns: { id: true, adminUserId: true }
  })
  return row ?? null
}

const generatorExists: Resolver<string, boolean> = async (db, id) => {
  const row = await db.query.generators.findFirst({
    where: eq(generators.id, id),
    columns: { id: true }
  })
  return row !== undefined
}

const generatorOrgId: Resolver<string, string | null> = async (db, id) => {
  const row = await db.query.generators.findFirst({
    where: eq(generators.id, id),
    columns: { organizationId: true }
  })
  return row?.organizationId ?? null
}

type OrgMemberInput = { userId: string; organizationId: string }

const orgMembershipHasForUserAndOrg: Resolver<OrgMemberInput, boolean> = async (
  db,
  { userId, organizationId }
) => {
  const row = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.userId, userId)
    ),
    columns: { id: true }
  })
  return row !== undefined
}

const orgMembershipByUserAndOrg: Resolver<
  OrgMemberInput,
  { id: string; organizationId: string; userId: string } | null
> = async (db, { userId, organizationId }) => {
  const row = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.organizationId, organizationId),
      eq(organizationMembers.userId, userId)
    ),
    columns: { id: true, organizationId: true, userId: true }
  })
  return row ?? null
}

const orgMembershipById: Resolver<
  string,
  { id: string; organizationId: string; userId: string } | null
> = async (db, id) => {
  const row = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.id, id),
    columns: { id: true, organizationId: true, userId: true }
  })
  return row ?? null
}

type AssignmentInput = { userId: string; generatorId: string }

const assignmentHasForUserAndGenerator: Resolver<
  AssignmentInput,
  boolean
> = async (db, { userId, generatorId }) => {
  const row = await db.query.generatorUserAssignments.findFirst({
    where: and(
      eq(generatorUserAssignments.generatorId, generatorId),
      eq(generatorUserAssignments.userId, userId)
    ),
    columns: { id: true }
  })
  return row !== undefined
}

const invitationById: Resolver<
  string,
  { organizationId: string; inviteeEmail: string } | null
> = async (db, id) => {
  const row = await db.query.invitations.findFirst({
    where: eq(invitations.id, id),
    columns: { organizationId: true, inviteeEmail: true }
  })
  if (!row) return null
  return {
    organizationId: row.organizationId,
    inviteeEmail: row.inviteeEmail
  }
}

type InvitationByOrgAndEmailInput = {
  organizationId: string
  inviteeEmail: string
}

const invitationByOrgAndEmail: Resolver<
  InvitationByOrgAndEmailInput,
  { organizationId: string; inviteeEmail: string } | null
> = async (db, { organizationId, inviteeEmail }) => {
  // Mirror the client resolver's normalization so the two sides resolve the
  // same decision's `invitation.byOrgAndEmail` fact identically. Stored
  // invitee emails are already lowercased at insert time, but normalizing
  // the caller-supplied value here is defence-in-depth against any future
  // insert path that forgets to do so.
  const row = await db.query.invitations.findFirst({
    where: and(
      eq(invitations.organizationId, organizationId),
      eq(invitations.inviteeEmail, inviteeEmail.trim().toLowerCase())
    ),
    columns: { organizationId: true, inviteeEmail: true }
  })
  if (!row) return null
  return {
    organizationId: row.organizationId,
    inviteeEmail: row.inviteeEmail
  }
}

const maintenanceTemplateById: Resolver<
  string,
  {
    generatorId: string
    triggerType: TriggerType
    triggerHoursInterval: number | null
    triggerCalendarDays: number | null
  } | null
> = async (db, id) => {
  const row = await db.query.maintenanceTemplates.findFirst({
    where: eq(maintenanceTemplates.id, id),
    columns: {
      generatorId: true,
      triggerType: true,
      triggerHoursInterval: true,
      triggerCalendarDays: true
    }
  })
  if (!row) return null
  return {
    generatorId: row.generatorId,
    triggerType: row.triggerType,
    triggerHoursInterval: row.triggerHoursInterval,
    triggerCalendarDays: row.triggerCalendarDays
  }
}

const maintenanceRecordById: Resolver<
  string,
  { generatorId: string; performedByUserId: string } | null
> = async (db, id) => {
  const row = await db.query.maintenanceRecords.findFirst({
    where: eq(maintenanceRecords.id, id),
    columns: { generatorId: true, performedByUserId: true }
  })
  if (!row) return null
  return {
    generatorId: row.generatorId,
    performedByUserId: row.performedByUserId
  }
}

interface ServerFactRegistry {
  'session.byId': Resolver<string, SessionRef | null>
  'generator.byId': Resolver<string, { id: string } | null>
  'generator.exists': Resolver<string, boolean>
  'generator.orgId': Resolver<string, string | null>
  'session.hasOpenForGenerator': Resolver<string, boolean>
  'authz.generator': Resolver<
    GeneratorAuthzInput,
    { orgAdminUserId: string | null; hasAssignment: boolean } | null
  >
  'authz.org': Resolver<string, { adminUserId: string | null } | null>
  'organization.byId': Resolver<
    string,
    { id: string; adminUserId: string } | null
  >
  'orgMembership.hasForUserAndOrg': Resolver<OrgMemberInput, boolean>
  'orgMembership.byUserAndOrg': Resolver<
    OrgMemberInput,
    { id: string; organizationId: string; userId: string } | null
  >
  'orgMembership.byId': Resolver<
    string,
    { id: string; organizationId: string; userId: string } | null
  >
  'assignment.hasForUserAndGenerator': Resolver<AssignmentInput, boolean>
  'invitation.byId': Resolver<
    string,
    { organizationId: string; inviteeEmail: string } | null
  >
  'invitation.byOrgAndEmail': Resolver<
    InvitationByOrgAndEmailInput,
    { organizationId: string; inviteeEmail: string } | null
  >
  'maintenanceTemplate.byId': Resolver<
    string,
    {
      generatorId: string
      triggerType: TriggerType
      triggerHoursInterval: number | null
      triggerCalendarDays: number | null
    } | null
  >
  'maintenanceRecord.byId': Resolver<
    string,
    { generatorId: string; performedByUserId: string } | null
  >
}

const serverFactRegistry: ServerFactRegistry = {
  'session.byId': sessionById,
  'generator.byId': generatorById,
  'generator.exists': generatorExists,
  'generator.orgId': generatorOrgId,
  'session.hasOpenForGenerator': sessionHasOpenForGenerator,
  'authz.generator': authzGenerator,
  'authz.org': authzOrg,
  'organization.byId': organizationById,
  'orgMembership.hasForUserAndOrg': orgMembershipHasForUserAndOrg,
  'orgMembership.byUserAndOrg': orgMembershipByUserAndOrg,
  'orgMembership.byId': orgMembershipById,
  'assignment.hasForUserAndGenerator': assignmentHasForUserAndGenerator,
  'invitation.byId': invitationById,
  'invitation.byOrgAndEmail': invitationByOrgAndEmail,
  'maintenanceTemplate.byId': maintenanceTemplateById,
  'maintenanceRecord.byId': maintenanceRecordById
}

export function serverLookup(
  db: Db
): (key: string, input: unknown) => Promise<unknown> {
  return async (key, input) => {
    const resolver = (
      serverFactRegistry as unknown as Record<
        string,
        (db: Db, input: unknown) => Promise<unknown>
      >
    )[key]
    if (!resolver) throw new Error(`no server resolver for fact key "${key}"`)
    return resolver(db, input)
  }
}
