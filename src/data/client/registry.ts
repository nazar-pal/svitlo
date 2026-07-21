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
import type { RecordRef } from '@/data/shared/maintenance'
import type { SessionRef } from '@/data/shared/sessions'
import type { DrizzleCompilable } from '@/lib/hooks/use-drizzle-query'
import type { ClientDb } from '@/lib/powersync/database'

import type { ReactiveRegistry } from '@/data/shared/facts/reactive-adapter'

// Client-side fact registry. Each resolver exposes two members:
//
//   build:   a Drizzle builder. Async callers execute it, reactive callers
//            feed it to `useDrizzleQuery`. This keeps the SQL for every
//            fact in exactly one place across both delivery paths.
//   project: row(s) → fact shape. Also shared across both paths so
//            projection drift between async/reactive is impossible.
//
// Decisions reference resolvers by the key they're registered under here;
// the `satisfies` check against the shared `FactContracts` map guarantees
// every key resolves and every input/fact shape matches the server side.
//
// Members are declared as methods so entries with concrete `Row` types stay
// assignable to the `Row = unknown` erasure used at the lookup boundary.
interface Entry<Input, Row, Output> {
  build(db: ClientDb, input: Input): DrizzleCompilable<Row>
  project(rows: readonly Row[]): Output
}

const sessionByIdEntry: Entry<
  string,
  { generatorId: string; startedByUserId: string; stoppedAt: string | null },
  SessionRef | null
> = {
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
    const [row] = rows
    if (!row) return null
    return {
      generatorId: row.generatorId,
      startedByUserId: row.startedByUserId,
      isStopped: row.stoppedAt !== null
    }
  }
}

const generatorByIdEntry: Entry<string, { id: string }, { id: string } | null> =
  {
    build: (db, id) =>
      db
        .select({ id: generators.id })
        .from(generators)
        .where(eq(generators.id, id))
        .limit(1),
    project: rows => rows[0] ?? null
  }

const sessionHasOpenForGeneratorEntry: Entry<string, { id: string }, boolean> =
  {
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
  GeneratorUserInput,
  { orgAdminUserId: string | null; hasAssignment: number },
  GeneratorAuthzFact | null
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
    const [row] = rows
    if (!row) return null
    return {
      orgAdminUserId: row.orgAdminUserId,
      hasAssignment: row.hasAssignment === 1
    }
  }
}

const authzOrgEntry: Entry<string, OrgAuthzFact, OrgAuthzFact | null> = {
  build: (db, orgId) =>
    db
      .select({ adminUserId: organizations.adminUserId })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1),
  project: rows => rows[0] ?? null
}

const organizationByIdEntry: Entry<
  string,
  OrganizationRef,
  OrganizationRef | null
> = {
  build: (db, id) =>
    db
      .select({ id: organizations.id, adminUserId: organizations.adminUserId })
      .from(organizations)
      .where(eq(organizations.id, id))
      .limit(1),
  project: rows => rows[0] ?? null
}

const generatorOrgIdEntry: Entry<
  string,
  { organizationId: string },
  string | null
> = {
  build: (db, id) =>
    db
      .select({ organizationId: generators.organizationId })
      .from(generators)
      .where(eq(generators.id, id))
      .limit(1),
  project: rows => rows[0]?.organizationId ?? null
}

const orgMembershipByUserAndOrgEntry: Entry<
  OrgMemberInput,
  MemberRef,
  MemberRef | null
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
  project: rows => rows[0] ?? null
}

const orgMembershipHasForUserAndOrgEntry: Entry<
  OrgMemberInput,
  MemberRef,
  boolean
> = {
  build: orgMembershipByUserAndOrgEntry.build,
  project: rows => rows.length > 0
}

const orgMembershipByIdEntry: Entry<string, MemberRef, MemberRef | null> = {
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
  project: rows => rows[0] ?? null
}

const assignmentHasForUserAndGeneratorEntry: Entry<
  GeneratorUserInput,
  { id: string },
  boolean
> = {
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

const invitationByIdEntry: Entry<string, InvitationRef, InvitationRef | null> =
  {
    build: (db, id) =>
      db
        .select({
          organizationId: invitations.organizationId,
          inviteeEmail: invitations.inviteeEmail
        })
        .from(invitations)
        .where(eq(invitations.id, id))
        .limit(1),
    project: rows => rows[0] ?? null
  }

const invitationByOrgAndEmailEntry: Entry<
  FactInput<'invitation.byOrgAndEmail'>,
  InvitationRef,
  InvitationRef | null
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
  project: rows => rows[0] ?? null
}

const maintenanceTemplateByIdEntry: Entry<
  string,
  TemplateRef,
  TemplateRef | null
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
  project: rows => rows[0] ?? null
}

const maintenanceRecordByIdEntry: Entry<string, RecordRef, RecordRef | null> = {
  build: (db, id) =>
    db
      .select({
        generatorId: maintenanceRecords.generatorId,
        performedByUserId: maintenanceRecords.performedByUserId
      })
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.id, id))
      .limit(1),
  project: rows => rows[0] ?? null
}

// Flat registry — keys chosen to mirror the domain-qualified names used in
// decision plans. Adding a new fact takes one contract entry in
// `@/data/shared/facts/contracts.ts` plus one resolver here and one in the
// server registry; the `satisfies` check fails until all three agree.
const clientFactRegistry = {
  'session.byId': sessionByIdEntry,
  'generator.byId': generatorByIdEntry,
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
} satisfies { [K in FactKey]: Entry<FactInput<K>, unknown, FactOf<K>> }

// Per-key `Input`/`Row` types erase to `unknown` at the lookup boundary —
// the adapters traffic in `unknown` either way, and method bivariance makes
// this a plain assignment rather than a cast.
const erasedRegistry: Record<
  string,
  Entry<unknown, unknown, unknown>
> = clientFactRegistry

// Async lookup: reads registry[key], executes the builder, returns the
// projection. Same key namespace as the reactive adapter, so a single
// decision's plan drives both paths.
export function clientLookup(
  db: ClientDb
): (key: string, input: unknown) => Promise<unknown> {
  return async (key, input) => {
    const entry = erasedRegistry[key]
    if (!entry) throw new Error(`no client resolver for fact key "${key}"`)
    // Select builders always resolve to an array of rows.
    const rows = (await entry.build(db, input).execute()) as readonly unknown[]
    return entry.project(rows)
  }
}

// Reactive registry adapter: same projection but the builder is fed to
// `useDrizzleQuery` rather than executed. `getDb` resolves the module-level
// PowerSync handle lazily — the production entry passes a getter that
// returns `db` from `@/lib/powersync/database`, while jest tests pass a
// getter that resolves the per-test in-memory `drizzle` handle after
// `beforeAll` runs. Lazy resolution matters because `use-policy.ts` builds
// the registry at module load time, before test mocks are wired.
export function buildReactiveRegistry(getDb: () => ClientDb): ReactiveRegistry {
  const out: ReactiveRegistry = {}
  for (const [key, entry] of Object.entries(erasedRegistry)) {
    out[key] = {
      build: input => entry.build(getDb(), input),
      project: entry.project
    }
  }
  return out
}
