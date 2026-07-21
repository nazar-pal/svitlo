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
import type {
  GeneratorAuthzFact,
  OrgAuthzFact
} from '@/data/shared/authz/policy'
import type {
  FactInput,
  FactKey,
  FactOf,
  GeneratorUserInput,
  InvitationRef,
  OrganizationRef,
  OrgMemberInput,
  MemberRef,
  TemplateRef
} from '@/data/shared/facts/contracts'
import type { FactLookup } from '@/data/shared/facts/port'
import type { RecordRef } from '@/data/shared/maintenance'
import type { SessionRef } from '@/data/shared/sessions'

type Db = typeof serverDb

// Server-side fact registry. No reactive path here (Postgres is behind
// oRPC, not subscribed to), so resolvers are flat async functions. The
// fact-key namespace mirrors `@/data/client/registry.ts`; the `satisfies`
// check against the shared `FactContracts` map keeps the two sides from
// drifting apart.

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

const authzGenerator: Resolver<
  GeneratorUserInput,
  GeneratorAuthzFact | null
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
    // `sql<boolean>` is a compile-time claim only, and this flag grants
    // access — coerce defensively (the client registry does the same with
    // `=== 1`) so a driver returning 't'/'f' strings cannot truthy-grant.
    hasAssignment: row.hasAssignment === true
  }
}

const authzOrg: Resolver<string, OrgAuthzFact | null> = async (db, orgId) => {
  const row = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { adminUserId: true }
  })
  return row ? { adminUserId: row.adminUserId } : null
}

const organizationById: Resolver<string, OrganizationRef | null> = async (
  db,
  id
) => {
  const row = await db.query.organizations.findFirst({
    where: eq(organizations.id, id),
    columns: { id: true, adminUserId: true }
  })
  return row ?? null
}

const generatorOrgId: Resolver<string, string | null> = async (db, id) => {
  const row = await db.query.generators.findFirst({
    where: eq(generators.id, id),
    columns: { organizationId: true }
  })
  return row?.organizationId ?? null
}

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
  MemberRef | null
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

const orgMembershipById: Resolver<string, MemberRef | null> = async (
  db,
  id
) => {
  const row = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.id, id),
    columns: { id: true, organizationId: true, userId: true }
  })
  return row ?? null
}

const assignmentHasForUserAndGenerator: Resolver<
  GeneratorUserInput,
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

const invitationById: Resolver<string, InvitationRef | null> = async (
  db,
  id
) => {
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

const invitationByOrgAndEmail: Resolver<
  FactInput<'invitation.byOrgAndEmail'>,
  InvitationRef | null
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

const maintenanceTemplateById: Resolver<string, TemplateRef | null> = async (
  db,
  id
) => {
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

const maintenanceRecordById: Resolver<string, RecordRef | null> = async (
  db,
  id
) => {
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

const serverFactRegistry = {
  'session.byId': sessionById,
  'generator.byId': generatorById,
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
} satisfies { [K in FactKey]: Resolver<FactInput<K>, FactOf<K>> }

export function serverLookup(db: Db): FactLookup {
  // Per-key `Input` types erase to `unknown` at the lookup boundary — the
  // adapters traffic in `unknown` either way.
  const erased = serverFactRegistry as unknown as Record<
    string,
    Resolver<unknown, unknown>
  >
  return async (key, input) => {
    const resolver = erased[key]
    if (!resolver) throw new Error(`no server resolver for fact key "${key}"`)
    return resolver(db, input)
  }
}
