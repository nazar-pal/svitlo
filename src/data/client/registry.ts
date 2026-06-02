import { and, eq, isNull, sql } from 'drizzle-orm'

import {
  generators,
  generatorSessions,
  generatorUserAssignments,
  invitations,
  maintenanceRecords,
  maintenanceTemplates,
  organizationMembers,
  organizations
} from '@/data/client/db-schema'
import type { SessionRef } from '@/data/shared/sessions'
import type { TriggerType } from '@/lib/maintenance/trigger-type'
import type { ClientDb } from '@/lib/powersync/database'

import type { ReactiveRegistry } from '@/data/shared/facts/reactive-adapter'

// Client-side fact registry. Each resolver exposes two members:
//
//   build:   a Drizzle builder. Async callers `await` it, reactive callers
//            feed it to `useDrizzleQuery`. This keeps the SQL for every
//            fact in exactly one place across both delivery paths.
//   project: row(s) → fact shape. Also shared across both paths so
//            projection drift between async/reactive is impossible.
//
// Decisions reference resolvers by the key they're registered under here.

interface Entry<Input, Output> {
  build: (
    db: ClientDb,
    input: Input
  ) => {
    execute: () => Promise<unknown>
    toSQL: () => { sql: string; params: unknown[] }
  }
  project: (rows: readonly unknown[]) => Output
}

type GeneratorAuthzInput = { userId: string; generatorId: string }

const sessionByIdEntry: Entry<string, SessionRef | null> = {
  build: (db, id) =>
    db
      .select({
        generatorId: generatorSessions.generatorId,
        startedByUserId: generatorSessions.startedByUserId,
        stoppedAt: generatorSessions.stoppedAt
      })
      .from(generatorSessions)
      .where(eq(generatorSessions.id, id))
      .limit(1),
  project: rows => {
    const [row] = rows as readonly {
      generatorId: string
      startedByUserId: string
      stoppedAt: string | null
    }[]
    if (!row) return null
    return {
      generatorId: row.generatorId,
      startedByUserId: row.startedByUserId,
      isStopped: row.stoppedAt !== null
    }
  }
}

const generatorByIdEntry: Entry<string, { id: string } | null> = {
  build: (db, id) =>
    db
      .select({ id: generators.id })
      .from(generators)
      .where(eq(generators.id, id))
      .limit(1),
  project: rows => {
    const [row] = rows as readonly { id: string }[]
    return row ?? null
  }
}

const sessionHasOpenForGeneratorEntry: Entry<string, boolean> = {
  build: (db, generatorId) =>
    db
      .select({ id: generatorSessions.id })
      .from(generatorSessions)
      .where(
        and(
          eq(generatorSessions.generatorId, generatorId),
          isNull(generatorSessions.stoppedAt)
        )
      )
      .limit(1),
  project: rows => rows.length > 0
}

const authzGeneratorEntry: Entry<
  GeneratorAuthzInput,
  { orgAdminUserId: string | null; hasAssignment: boolean } | null
> = {
  build: (db, { userId, generatorId }) =>
    db
      .select({
        orgAdminUserId: organizations.adminUserId,
        hasAssignment: sql<number>`
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
      .limit(1),
  project: rows => {
    const [row] = rows as readonly {
      orgAdminUserId: string | null
      hasAssignment: number
    }[]
    if (!row) return null
    return {
      orgAdminUserId: row.orgAdminUserId,
      hasAssignment: row.hasAssignment === 1
    }
  }
}

const authzOrgEntry: Entry<string, { adminUserId: string | null } | null> = {
  build: (db, orgId) =>
    db
      .select({ adminUserId: organizations.adminUserId })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1),
  project: rows => {
    const [row] = rows as readonly { adminUserId: string | null }[]
    return row ?? null
  }
}

const organizationByIdEntry: Entry<
  string,
  { id: string; adminUserId: string } | null
> = {
  build: (db, id) =>
    db
      .select({ id: organizations.id, adminUserId: organizations.adminUserId })
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1),
  project: rows => {
    const [row] = rows as readonly { id: string; adminUserId: string }[]
    return row ?? null
  }
}

const generatorOrgIdEntry: Entry<string, string | null> = {
  build: (db, id) =>
    db
      .select({ organizationId: generators.organizationId })
      .from(generators)
      .where(eq(generators.id, id))
      .limit(1),
  project: rows => {
    const [row] = rows as readonly { organizationId: string }[]
    return row?.organizationId ?? null
  }
}

const generatorExistsEntry: Entry<string, boolean> = {
  build: (db, id) =>
    db
      .select({ id: generators.id })
      .from(generators)
      .where(eq(generators.id, id))
      .limit(1),
  project: rows => rows.length > 0
}

type OrgMemberInput = { userId: string; organizationId: string }

const orgMembershipHasForUserAndOrgEntry: Entry<OrgMemberInput, boolean> = {
  build: (db, { userId, organizationId }) =>
    db
      .select({ id: organizationMembers.id })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        )
      )
      .limit(1),
  project: rows => rows.length > 0
}

const orgMembershipByUserAndOrgEntry: Entry<
  OrgMemberInput,
  { id: string; organizationId: string; userId: string } | null
> = {
  build: (db, { userId, organizationId }) =>
    db
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId)
        )
      )
      .limit(1),
  project: rows => {
    const [row] = rows as readonly {
      id: string
      organizationId: string
      userId: string
    }[]
    return row ?? null
  }
}

const orgMembershipByIdEntry: Entry<
  string,
  { id: string; organizationId: string; userId: string } | null
> = {
  build: (db, id) =>
    db
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        userId: organizationMembers.userId
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.id, id))
      .limit(1),
  project: rows => {
    const [row] = rows as readonly {
      id: string
      organizationId: string
      userId: string
    }[]
    return row ?? null
  }
}

type AssignmentInput = { userId: string; generatorId: string }

const assignmentHasForUserAndGeneratorEntry: Entry<AssignmentInput, boolean> = {
  build: (db, { userId, generatorId }) =>
    db
      .select({ id: generatorUserAssignments.id })
      .from(generatorUserAssignments)
      .where(
        and(
          eq(generatorUserAssignments.generatorId, generatorId),
          eq(generatorUserAssignments.userId, userId)
        )
      )
      .limit(1),
  project: rows => rows.length > 0
}

const invitationByIdEntry: Entry<
  string,
  { organizationId: string; inviteeEmail: string } | null
> = {
  build: (db, id) =>
    db
      .select({
        organizationId: invitations.organizationId,
        inviteeEmail: invitations.inviteeEmail
      })
      .from(invitations)
      .where(eq(invitations.id, id))
      .limit(1),
  project: rows => {
    const [row] = rows as readonly {
      organizationId: string
      inviteeEmail: string
    }[]
    return row ?? null
  }
}

type InvitationByOrgAndEmailInput = {
  organizationId: string
  inviteeEmail: string
}

const invitationByOrgAndEmailEntry: Entry<
  InvitationByOrgAndEmailInput,
  { organizationId: string; inviteeEmail: string } | null
> = {
  build: (db, { organizationId, inviteeEmail }) =>
    db
      .select({
        organizationId: invitations.organizationId,
        inviteeEmail: invitations.inviteeEmail
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.organizationId, organizationId),
          eq(invitations.inviteeEmail, inviteeEmail.trim().toLowerCase())
        )
      )
      .limit(1),
  project: rows => {
    const [row] = rows as readonly {
      organizationId: string
      inviteeEmail: string
    }[]
    return row ?? null
  }
}

const maintenanceTemplateByIdEntry: Entry<
  string,
  {
    generatorId: string
    triggerType: TriggerType
    triggerHoursInterval: number | null
    triggerCalendarDays: number | null
  } | null
> = {
  build: (db, id) =>
    db
      .select({
        generatorId: maintenanceTemplates.generatorId,
        triggerType: maintenanceTemplates.triggerType,
        triggerHoursInterval: maintenanceTemplates.triggerHoursInterval,
        triggerCalendarDays: maintenanceTemplates.triggerCalendarDays
      })
      .from(maintenanceTemplates)
      .where(eq(maintenanceTemplates.id, id))
      .limit(1),
  project: rows => {
    const [row] = rows as readonly {
      generatorId: string
      triggerType: TriggerType
      triggerHoursInterval: number | null
      triggerCalendarDays: number | null
    }[]
    return row ?? null
  }
}

const maintenanceRecordByIdEntry: Entry<
  string,
  { generatorId: string; performedByUserId: string } | null
> = {
  build: (db, id) =>
    db
      .select({
        generatorId: maintenanceRecords.generatorId,
        performedByUserId: maintenanceRecords.performedByUserId
      })
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.id, id))
      .limit(1),
  project: rows => {
    const [row] = rows as readonly {
      generatorId: string
      performedByUserId: string
    }[]
    return row ?? null
  }
}

// Flat registry — keys chosen to mirror the domain-qualified names used in
// decision plans. Adding a new fact takes one entry here + one plan entry
// in the domain's decision file.
interface ClientFactRegistry {
  'session.byId': Entry<string, SessionRef | null>
  'generator.byId': Entry<string, { id: string } | null>
  'generator.exists': Entry<string, boolean>
  'generator.orgId': Entry<string, string | null>
  'session.hasOpenForGenerator': Entry<string, boolean>
  'authz.generator': Entry<
    GeneratorAuthzInput,
    { orgAdminUserId: string | null; hasAssignment: boolean } | null
  >
  'authz.org': Entry<string, { adminUserId: string | null } | null>
  'organization.byId': Entry<string, { id: string; adminUserId: string } | null>
  'orgMembership.hasForUserAndOrg': Entry<OrgMemberInput, boolean>
  'orgMembership.byUserAndOrg': Entry<
    OrgMemberInput,
    { id: string; organizationId: string; userId: string } | null
  >
  'orgMembership.byId': Entry<
    string,
    { id: string; organizationId: string; userId: string } | null
  >
  'assignment.hasForUserAndGenerator': Entry<AssignmentInput, boolean>
  'invitation.byId': Entry<
    string,
    { organizationId: string; inviteeEmail: string } | null
  >
  'invitation.byOrgAndEmail': Entry<
    InvitationByOrgAndEmailInput,
    { organizationId: string; inviteeEmail: string } | null
  >
  'maintenanceTemplate.byId': Entry<
    string,
    {
      generatorId: string
      triggerType: TriggerType
      triggerHoursInterval: number | null
      triggerCalendarDays: number | null
    } | null
  >
  'maintenanceRecord.byId': Entry<
    string,
    { generatorId: string; performedByUserId: string } | null
  >
}

const clientFactRegistry: ClientFactRegistry = {
  'session.byId': sessionByIdEntry,
  'generator.byId': generatorByIdEntry,
  'generator.exists': generatorExistsEntry,
  'generator.orgId': generatorOrgIdEntry,
  'session.hasOpenForGenerator': sessionHasOpenForGeneratorEntry,
  'authz.generator': authzGeneratorEntry,
  'authz.org': authzOrgEntry,
  'organization.byId': organizationByIdEntry,
  'orgMembership.hasForUserAndOrg': orgMembershipHasForUserAndOrgEntry,
  'orgMembership.byUserAndOrg': orgMembershipByUserAndOrgEntry,
  'orgMembership.byId': orgMembershipByIdEntry,
  'assignment.hasForUserAndGenerator': assignmentHasForUserAndGeneratorEntry,
  'invitation.byId': invitationByIdEntry,
  'invitation.byOrgAndEmail': invitationByOrgAndEmailEntry,
  'maintenanceTemplate.byId': maintenanceTemplateByIdEntry,
  'maintenanceRecord.byId': maintenanceRecordByIdEntry
}

// Async lookup: reads registry[key], awaits the builder, returns projection.
// Same key namespace as the reactive adapter, so a single decision's plan
// drives both paths.
export function clientLookup(
  db: ClientDb
): (key: string, input: unknown) => Promise<unknown> {
  const flat = clientFactRegistry as unknown as Record<
    string,
    Entry<unknown, unknown>
  >
  return async (key, input) => {
    const entry = flat[key]
    if (!entry) throw new Error(`no client resolver for fact key "${key}"`)
    const rows = (await entry.build(db, input)) as unknown as readonly unknown[]
    return entry.project(rows)
  }
}

// Reactive registry adapter: same projection but the builder is fed to
// `useDrizzleQuery` rather than awaited. `getDb` resolves the module-level
// PowerSync handle lazily — the production entry passes a getter that
// returns `db` from `@/lib/powersync/database`, while jest tests pass a
// getter that resolves the per-test in-memory `drizzle` handle after
// `beforeAll` runs. Lazy resolution matters because `use-policy.ts` builds
// the registry at module load time, before test mocks are wired.
export function buildReactiveRegistry(getDb: () => ClientDb): ReactiveRegistry {
  const out: ReactiveRegistry = {}
  for (const [key, entry] of Object.entries(clientFactRegistry)) {
    const typed = entry as Entry<unknown, unknown>
    out[key] = {
      build: input => typed.build(getDb(), input),
      project: rows => typed.project(rows)
    }
  }
  return out
}
