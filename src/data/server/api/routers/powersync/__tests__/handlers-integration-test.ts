import { eq } from 'drizzle-orm'

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

import type { WriteContext } from '../handlers'
import {
  handleUser,
  handleOrganizations,
  handleOrganizationMembers,
  handleInvitations,
  handleGenerators,
  handleGeneratorUserAssignments,
  handleGeneratorSessions,
  handleMaintenanceTemplates,
  handleMaintenanceRecords
} from '../handlers'
import {
  createTestServerDatabase,
  resetServerDatabase,
  closeServerDatabase
} from './test-server-db'
import {
  IDS,
  seedBaseScenario,
  seedAssignment,
  seedInvitation,
  seedSession,
  seedTemplate,
  seedRecord
} from './seed-server'

// ── Setup ───────────────────────────────────────────────────────────────────

let testDb: Awaited<ReturnType<typeof createTestServerDatabase>>

beforeAll(async () => {
  testDb = await createTestServerDatabase()
})

beforeEach(async () => {
  await resetServerDatabase()
  await seedBaseScenario(testDb.db)
})

afterAll(async () => {
  await closeServerDatabase()
})

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeCtx(overrides: Partial<WriteContext> = {}): WriteContext {
  return {
    db: testDb.db as unknown as WriteContext['db'],
    userId: IDS.admin,
    userEmail: 'admin@test.com',
    op: 'insert',
    id: crypto.randomUUID(),
    data: {},
    ...overrides
  }
}

// ── handleUser ──────────────────────────────────────────────────────────────

describe('handleUser', () => {
  it('rejects insert', async () => {
    const result = await handleUser(makeCtx({ op: 'insert' }))
    expect(result.ok).toBe(false)
  })

  it('rejects delete', async () => {
    const result = await handleUser(makeCtx({ op: 'delete' }))
    expect(result.ok).toBe(false)
  })

  it('rejects updating another user', async () => {
    const result = await handleUser(
      makeCtx({ op: 'update', id: IDS.member, userId: IDS.admin })
    )
    expect(result.ok).toBe(false)
  })

  it('updates own name', async () => {
    const result = await handleUser(
      makeCtx({
        op: 'update',
        id: IDS.admin,
        data: { name: 'New Name' }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.user.findFirst({
      where: eq(userTable.id, IDS.admin)
    })
    expect(row!.name).toBe('New Name')
  })

  it('updates own image (string)', async () => {
    const result = await handleUser(
      makeCtx({
        op: 'update',
        id: IDS.admin,
        data: { image: 'https://img.url' }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.user.findFirst({
      where: eq(userTable.id, IDS.admin)
    })
    expect(row!.image).toBe('https://img.url')
  })

  it('updates own image (null)', async () => {
    // First set an image, then null it
    await handleUser(
      makeCtx({
        op: 'update',
        id: IDS.admin,
        data: { image: 'https://img.url' }
      })
    )
    const result = await handleUser(
      makeCtx({ op: 'update', id: IDS.admin, data: { image: null } })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.user.findFirst({
      where: eq(userTable.id, IDS.admin)
    })
    expect(row!.image).toBeNull()
  })

  // SECURITY: non-whitelisted fields are silently dropped
  it('ignores non-whitelisted fields', async () => {
    const result = await handleUser(
      makeCtx({
        op: 'update',
        id: IDS.admin,
        data: { name: 'X', email: 'hack@evil.com', emailVerified: true }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.user.findFirst({
      where: eq(userTable.id, IDS.admin)
    })
    expect(row!.name).toBe('X')
    expect(row!.email).toBe('admin@test.com') // unchanged
  })

  it('no-ops when no whitelisted fields present', async () => {
    const result = await handleUser(
      makeCtx({
        op: 'update',
        id: IDS.admin,
        data: { email: 'hack@evil.com' }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.user.findFirst({
      where: eq(userTable.id, IDS.admin)
    })
    expect(row!.email).toBe('admin@test.com')
  })
})

// ── handleOrganizations ─────────────────────────────────────────────────────

describe('handleOrganizations', () => {
  // SECURITY: adminUserId is always forced to the calling user
  it('insert forces adminUserId to caller', async () => {
    const newId = crypto.randomUUID()
    const result = await handleOrganizations(
      makeCtx({
        op: 'insert',
        id: newId,
        data: { name: 'My Org', admin_user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, newId)
    })
    expect(row!.adminUserId).toBe(IDS.admin) // forced to caller, not outsider
  })

  it('update succeeds for admin with name', async () => {
    const result = await handleOrganizations(
      makeCtx({ op: 'update', id: IDS.org, data: { name: 'New Name' } })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(row!.name).toBe('New Name')
  })

  // SECURITY: non-whitelisted fields dropped — only name is updatable
  it('update ignores non-whitelisted fields', async () => {
    const result = await handleOrganizations(
      makeCtx({
        op: 'update',
        id: IDS.org,
        data: { name: 'X', admin_user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(row!.name).toBe('X')
    expect(row!.adminUserId).toBe(IDS.admin) // unchanged
  })

  it('update no-ops when no whitelisted fields', async () => {
    const result = await handleOrganizations(
      makeCtx({
        op: 'update',
        id: IDS.org,
        data: { admin_user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(row!.adminUserId).toBe(IDS.admin)
  })

  it('rejects non-admin update and leaves the org intact', async () => {
    const result = await handleOrganizations(
      makeCtx({
        op: 'update',
        id: IDS.org,
        userId: IDS.member,
        data: { name: 'Hacked' }
      })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(row!.name).not.toBe('Hacked')
  })

  // PG CHECK constraint
  it('insert: PG rejects empty name via CHECK constraint', async () => {
    const result = handleOrganizations(
      makeCtx({
        op: 'insert',
        data: { name: '  ', admin_user_id: IDS.admin }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('rejects non-admin delete and leaves the org intact', async () => {
    const result = await handleOrganizations(
      makeCtx({ op: 'delete', id: IDS.org, userId: IDS.member })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(row).toBeDefined()
  })

  it('delete succeeds for admin and cascades', async () => {
    await seedAssignment(testDb.db)
    const result = await handleOrganizations(
      makeCtx({ op: 'delete', id: IDS.org })
    )
    expect(result.ok).toBe(true)
    // Org gone
    const org = await testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(org).toBeUndefined()
    // CASCADE: generator gone too
    const gen = await testDb.db.query.generators.findFirst({
      where: eq(generators.id, IDS.generator)
    })
    expect(gen).toBeUndefined()
  })
})

// ── trigger: validate_org_admin_immutable ──────────────────────────────────
// Directly exercises the trigger by bypassing the handler whitelist. The
// production handler strips admin_user_id from the update path, so handler
// tests alone can never prove the trigger is installed.

describe('trigger: validate_org_admin_immutable', () => {
  it('rejects direct update of admin_user_id', async () => {
    let caught: unknown
    try {
      await testDb.db
        .update(organizations)
        .set({ adminUserId: IDS.outsider })
        .where(eq(organizations.id, IDS.org))
    } catch (e) {
      caught = e
    }
    // Drizzle wraps the PGlite error; the trigger's RAISE EXCEPTION message
    // surfaces via the cause chain.
    expect(caught).toBeDefined()
    const causeMessage = (caught as { cause?: { message?: string } }).cause
      ?.message
    expect(causeMessage).toMatch(/admin_user_id cannot be changed/)
  })
})

// ── handleInvitations ───────────────────────────────────────────────────────

describe('handleInvitations', () => {
  it('insert: admin creates invitation', async () => {
    const newId = crypto.randomUUID()
    const result = await handleInvitations(
      makeCtx({
        op: 'insert',
        id: newId,
        data: {
          organization_id: IDS.org,
          invitee_email: 'new@test.com',
          invited_by_user_id: IDS.admin
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.invitations.findFirst({
      where: eq(invitations.id, newId)
    })
    expect(row).toBeDefined()
    expect(row!.inviteeEmail).toBe('new@test.com')
  })

  it('insert: non-admin denied', async () => {
    const result = await handleInvitations(
      makeCtx({
        op: 'insert',
        userId: IDS.member,
        data: {
          organization_id: IDS.org,
          invitee_email: 'x@test.com',
          invited_by_user_id: IDS.member
        }
      })
    )
    expect(result.ok).toBe(false)
  })

  it('delete: admin cancels', async () => {
    await seedInvitation(testDb.db)
    const result = await handleInvitations(
      makeCtx({ op: 'delete', id: IDS.invitation })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.invitations.findFirst({
      where: eq(invitations.id, IDS.invitation)
    })
    expect(row).toBeUndefined()
  })

  // SECURITY: case-insensitive email comparison
  it('delete: invitee declines (case-insensitive email)', async () => {
    await seedInvitation(testDb.db, 'Test@Example.com')
    const result = await handleInvitations(
      makeCtx({
        op: 'delete',
        id: IDS.invitation,
        userId: IDS.outsider,
        userEmail: 'test@example.com'
      })
    )
    expect(result.ok).toBe(true)
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleInvitations(
      makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  it('insert: duplicate invitation for same org+email is idempotent (onConflictDoNothing)', async () => {
    await seedInvitation(testDb.db)
    const duplicateId = crypto.randomUUID()
    const result = await handleInvitations(
      makeCtx({
        op: 'insert',
        id: duplicateId,
        data: {
          organization_id: IDS.org,
          invitee_email: 'invitee@test.com',
          invited_by_user_id: IDS.admin
        }
      })
    )
    expect(result.ok).toBe(true)
    const rows = await testDb.db
      .select()
      .from(invitations)
      .where(eq(invitations.organizationId, IDS.org))
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(IDS.invitation)
  })

  it('delete: unauthorized (neither admin nor invitee)', async () => {
    await seedInvitation(testDb.db, 'someone@test.com')
    const result = await handleInvitations(
      makeCtx({
        op: 'delete',
        id: IDS.invitation,
        userId: IDS.outsider,
        userEmail: 'wrong@test.com'
      })
    )
    expect(result.ok).toBe(false)
  })

  it('invalid op (update) denied', async () => {
    const result = await handleInvitations(makeCtx({ op: 'update' }))
    expect(result.ok).toBe(false)
  })

  // PG CHECK constraint
  it('insert: PG rejects empty invitee email via CHECK constraint', async () => {
    const result = handleInvitations(
      makeCtx({
        op: 'insert',
        data: {
          organization_id: IDS.org,
          invitee_email: '  ',
          invited_by_user_id: IDS.admin
        }
      })
    )
    await expect(result).rejects.toThrow()
  })
})

// ── handleOrganizationMembers ───────────────────────────────────────────────

describe('handleOrganizationMembers', () => {
  it('insert: admin adds member', async () => {
    const newId = crypto.randomUUID()
    const result = await handleOrganizationMembers(
      makeCtx({
        op: 'insert',
        id: newId,
        data: { organization_id: IDS.org, user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, newId)
    })
    expect(row).toBeDefined()
  })

  it('insert: user accepts own invitation', async () => {
    await seedInvitation(testDb.db, 'outsider@test.com')
    const newId = crypto.randomUUID()
    const result = await handleOrganizationMembers(
      makeCtx({
        op: 'insert',
        id: newId,
        userId: IDS.outsider,
        userEmail: 'outsider@test.com',
        data: { organization_id: IDS.org, user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(true)
    // Invitation should be deleted after acceptance
    const inv = await testDb.db.query.invitations.findFirst({
      where: eq(invitations.id, IDS.invitation)
    })
    expect(inv).toBeUndefined()
  })

  it('insert: user accepts but no invitation', async () => {
    const result = await handleOrganizationMembers(
      makeCtx({
        op: 'insert',
        userId: IDS.outsider,
        userEmail: 'outsider@test.com',
        data: { organization_id: IDS.org, user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(false)
  })

  it('rejects non-admin non-self insert and creates no membership', async () => {
    const newId = crypto.randomUUID()
    const result = await handleOrganizationMembers(
      makeCtx({
        op: 'insert',
        id: newId,
        userId: IDS.member,
        data: { organization_id: IDS.org, user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, newId)
    })
    expect(row).toBeUndefined()
  })

  it('delete: admin removes member (transfers assignments)', async () => {
    await seedAssignment(testDb.db, IDS.member)

    const result = await handleOrganizationMembers(
      makeCtx({ op: 'delete', id: IDS.membership })
    )
    expect(result.ok).toBe(true)

    // Membership gone
    const member = await testDb.db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, IDS.membership)
    })
    expect(member).toBeUndefined()

    // Assignment transferred to admin
    const adminAssignment =
      await testDb.db.query.generatorUserAssignments.findFirst({
        where: eq(generatorUserAssignments.userId, IDS.admin)
      })
    expect(adminAssignment).toBeDefined()
  })

  it('delete: admin removes member with no assignments', async () => {
    const result = await handleOrganizationMembers(
      makeCtx({ op: 'delete', id: IDS.membership })
    )
    expect(result.ok).toBe(true)
    const member = await testDb.db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, IDS.membership)
    })
    expect(member).toBeUndefined()
  })

  it('delete: member leaves on own (transfers assignments to org admin)', async () => {
    await seedAssignment(testDb.db, IDS.member)

    const result = await handleOrganizationMembers(
      makeCtx({
        op: 'delete',
        id: IDS.membership,
        userId: IDS.member,
        userEmail: 'member@test.com'
      })
    )
    expect(result.ok).toBe(true)

    // Assignment transferred to org admin (IDS.admin)
    const adminAssignment =
      await testDb.db.query.generatorUserAssignments.findFirst({
        where: eq(generatorUserAssignments.userId, IDS.admin)
      })
    expect(adminAssignment).toBeDefined()
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleOrganizationMembers(
      makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  it('rejects outsider delete and leaves the membership intact', async () => {
    const result = await handleOrganizationMembers(
      makeCtx({ op: 'delete', id: IDS.membership, userId: IDS.outsider })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, IDS.membership)
    })
    expect(row).toBeDefined()
  })

  it('invalid op (update) denied', async () => {
    const result = await handleOrganizationMembers(makeCtx({ op: 'update' }))
    expect(result.ok).toBe(false)
  })
})

// ── handleGenerators ────────────────────────────────────────────────────────
// Authz branches (admin vs. non-admin) and field-level validation are covered
// by `src/data/shared/generators/__tests__/policy-test.ts` and the shared
// `checks-test.ts`. The tests below focus on what's unique to the server
// handler: SQL-write verification, the Zod whitelist regression, and the
// replay-handling edge case for delete.

describe('handleGenerators', () => {
  it('insert: admin creates', async () => {
    const newId = crypto.randomUUID()
    const result = await handleGenerators(
      makeCtx({
        op: 'insert',
        id: newId,
        data: {
          organization_id: IDS.org,
          title: 'New Gen',
          model: 'Honda',
          max_consecutive_run_hours: '8',
          required_rest_hours: '4',
          run_warning_threshold_pct: '80'
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.generators.findFirst({
      where: eq(generators.id, newId)
    })
    expect(row!.title).toBe('New Gen')
  })

  it('update: admin updates', async () => {
    const result = await handleGenerators(
      makeCtx({
        op: 'update',
        id: IDS.generator,
        data: { title: 'Updated Gen' }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.generators.findFirst({
      where: eq(generators.id, IDS.generator)
    })
    expect(row!.title).toBe('Updated Gen')
  })

  // Regression guard for the Zod whitelist: a compromised client that
  // sends a known column outside the update schema (here: `organization_id`
  // and `created_at`) must not be able to mutate that column. The schema
  // strips unknown keys, so only `title` should land in Postgres.
  it('update: ignores fields outside the schema whitelist', async () => {
    const result = await handleGenerators(
      makeCtx({
        op: 'update',
        id: IDS.generator,
        data: {
          title: 'Whitelisted',
          // Not in updateGeneratorSchema — Zod should strip.
          organization_id: 'attacker-org',
          created_at: '1970-01-01T00:00:00.000Z'
        }
      })
    )
    expect(result.ok).toBe(true)

    const row = await testDb.db.query.generators.findFirst({
      where: eq(generators.id, IDS.generator)
    })
    expect(row!.title).toBe('Whitelisted')
    // Unauthorized fields must stay at their seeded values.
    expect(row!.organizationId).toBe(IDS.org)
  })

  it('delete: admin deletes', async () => {
    const result = await handleGenerators(
      makeCtx({ op: 'delete', id: IDS.generator })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.generators.findFirst({
      where: eq(generators.id, IDS.generator)
    })
    expect(row).toBeUndefined()
  })

  // PowerSync replay: if the ack for a successful delete was lost, the
  // retry hits a missing row. The server must translate that into success
  // so the sync queue advances instead of logging a spurious rejection.
  it('delete: replay of already-deleted row returns ok', async () => {
    const result = await handleGenerators(
      makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  it('delete: cascades to sessions, templates, and assignments', async () => {
    await seedAssignment(testDb.db)
    await seedSession(testDb.db)
    await seedTemplate(testDb.db)

    const result = await handleGenerators(
      makeCtx({ op: 'delete', id: IDS.generator })
    )
    expect(result.ok).toBe(true)

    const assignment = await testDb.db.query.generatorUserAssignments.findFirst(
      {
        where: eq(generatorUserAssignments.id, IDS.assignment)
      }
    )
    expect(assignment).toBeUndefined()

    const session = await testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(session).toBeUndefined()

    const template = await testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, IDS.template)
    })
    expect(template).toBeUndefined()
  })
})

// ── handleGeneratorUserAssignments ──────────────────────────────────────────

describe('handleGeneratorUserAssignments', () => {
  it('insert: admin assigns', async () => {
    const newId = crypto.randomUUID()
    const result = await handleGeneratorUserAssignments(
      makeCtx({
        op: 'insert',
        id: newId,
        data: { generator_id: IDS.generator, user_id: IDS.member }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.generatorUserAssignments.findFirst({
      where: eq(generatorUserAssignments.id, newId)
    })
    expect(row).toBeDefined()
  })

  it('insert: duplicate assignment is idempotent (onConflictDoNothing)', async () => {
    await seedAssignment(testDb.db)
    const result = await handleGeneratorUserAssignments(
      makeCtx({
        op: 'insert',
        id: IDS.assignment,
        data: { generator_id: IDS.generator, user_id: IDS.member }
      })
    )
    expect(result.ok).toBe(true)
  })

  it('rejects non-admin insert and creates no assignment', async () => {
    const newId = crypto.randomUUID()
    const result = await handleGeneratorUserAssignments(
      makeCtx({
        op: 'insert',
        id: newId,
        userId: IDS.member,
        data: { generator_id: IDS.generator, user_id: IDS.member }
      })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.generatorUserAssignments.findFirst({
      where: eq(generatorUserAssignments.id, newId)
    })
    expect(row).toBeUndefined()
  })

  it('delete: admin removes', async () => {
    await seedAssignment(testDb.db)
    const result = await handleGeneratorUserAssignments(
      makeCtx({ op: 'delete', id: IDS.assignment })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.generatorUserAssignments.findFirst({
      where: eq(generatorUserAssignments.id, IDS.assignment)
    })
    expect(row).toBeUndefined()
  })

  it('rejects non-admin delete and leaves the assignment intact', async () => {
    await seedAssignment(testDb.db)
    const result = await handleGeneratorUserAssignments(
      makeCtx({ op: 'delete', id: IDS.assignment, userId: IDS.member })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.generatorUserAssignments.findFirst({
      where: eq(generatorUserAssignments.id, IDS.assignment)
    })
    expect(row).toBeDefined()
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleGeneratorUserAssignments(
      makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  it('invalid op (update) denied', async () => {
    const result = await handleGeneratorUserAssignments(
      makeCtx({ op: 'update' })
    )
    expect(result.ok).toBe(false)
  })
})

// ── handleGeneratorSessions ─────────────────────────────────────────────────

describe('handleGeneratorSessions', () => {
  // SECURITY: startedByUserId forced to caller
  it('insert: forces startedByUserId to caller', async () => {
    const newId = crypto.randomUUID()
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'insert',
        id: newId,
        data: {
          generator_id: IDS.generator,
          started_by_user_id: IDS.outsider
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, newId)
    })
    expect(row!.startedByUserId).toBe(IDS.admin) // forced to caller
  })

  it('insert: user with access via assignment', async () => {
    await seedAssignment(testDb.db)
    // Stop the default session first (unique partial index: one active per generator)
    const newId = crypto.randomUUID()
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'insert',
        id: newId,
        userId: IDS.member,
        data: { generator_id: IDS.generator }
      })
    )
    expect(result.ok).toBe(true)
  })

  it('rejects outsider insert and creates no session', async () => {
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'insert',
        userId: IDS.outsider,
        data: { generator_id: IDS.generator }
      })
    )
    expect(result.ok).toBe(false)

    const rows = await testDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.generatorId, IDS.generator))
    expect(rows).toHaveLength(0)
  })

  it('update: session found, has access', async () => {
    await seedSession(testDb.db)
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'update',
        id: IDS.session,
        data: {
          stopped_at: '2026-01-15T14:00:00Z',
          stopped_by_user_id: IDS.admin
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.stoppedAt).toBeInstanceOf(Date)
  })

  it('update: session not found', async () => {
    const result = await handleGeneratorSessions(
      makeCtx({ op: 'update', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(false)
  })

  // SECURITY: stoppedByUserId is always forced to the calling user
  it('update: enforces stoppedByUserId to caller', async () => {
    await seedSession(testDb.db)
    await seedAssignment(testDb.db)
    await handleGeneratorSessions(
      makeCtx({
        op: 'update',
        id: IDS.session,
        userId: IDS.member,
        data: { stopped_by_user_id: IDS.outsider }
      })
    )
    const row = await testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.stoppedByUserId).toBe(IDS.member) // forced to caller
  })

  // SECURITY: stopped_at string is converted to Date
  it('update: converts stopped_at string to Date', async () => {
    await seedSession(testDb.db)
    await handleGeneratorSessions(
      makeCtx({
        op: 'update',
        id: IDS.session,
        data: { stopped_at: '2026-01-15T14:00:00Z' }
      })
    )
    const row = await testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.stoppedAt).toBeInstanceOf(Date)
    expect(row!.stoppedAt!.toISOString()).toBe('2026-01-15T14:00:00.000Z')
  })

  it('update: handles null stopped_at', async () => {
    await seedSession(testDb.db)
    await handleGeneratorSessions(
      makeCtx({
        op: 'update',
        id: IDS.session,
        data: { stopped_at: null }
      })
    )
    const row = await testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.stoppedAt).toBeNull()
  })

  it('rejects outsider update and leaves the session intact', async () => {
    await seedSession(testDb.db)
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'update',
        id: IDS.session,
        userId: IDS.outsider,
        data: { stopped_at: '2026-01-15T14:00:00Z' }
      })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.stoppedAt).toBeNull()
  })

  it('rejects outsider delete and leaves the session intact', async () => {
    await seedSession(testDb.db)
    const result = await handleGeneratorSessions(
      makeCtx({ op: 'delete', id: IDS.session, userId: IDS.outsider })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row).toBeDefined()
  })

  it("delete: admin can delete anyone's stopped session", async () => {
    await seedSession(testDb.db, IDS.member, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    const result = await handleGeneratorSessions(
      makeCtx({ op: 'delete', id: IDS.session })
    )
    expect(result.ok).toBe(true)
  })

  it('delete: non-admin can delete own stopped session', async () => {
    await seedSession(testDb.db, IDS.member, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    await seedAssignment(testDb.db)
    const result = await handleGeneratorSessions(
      makeCtx({ op: 'delete', id: IDS.session, userId: IDS.member })
    )
    expect(result.ok).toBe(true)
  })

  it("delete: non-admin cannot delete other's stopped session", async () => {
    await seedSession(testDb.db, IDS.admin, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    await seedAssignment(testDb.db)
    const result = await handleGeneratorSessions(
      makeCtx({ op: 'delete', id: IDS.session, userId: IDS.member })
    )
    expect(result.ok).toBe(false)
  })

  it('delete: rejects active session with CANNOT_DELETE_ACTIVE_SESSION', async () => {
    await seedSession(testDb.db)
    const result = await handleGeneratorSessions(
      makeCtx({ op: 'delete', id: IDS.session })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('CANNOT_DELETE_ACTIVE_SESSION')

    const row = await testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row).toBeDefined()
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleGeneratorSessions(
      makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  it('insert: second active session for same generator is rejected with GENERATOR_ALREADY_ACTIVE', async () => {
    await seedSession(testDb.db)
    const secondId = crypto.randomUUID()
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'insert',
        id: secondId,
        data: { generator_id: IDS.generator }
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('GENERATOR_ALREADY_ACTIVE')

    const rows = await testDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.generatorId, IDS.generator))
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(IDS.session)
  })

  it('insert: lost-ack replay of the same id by the same user returns ok', async () => {
    // PowerSync resends the same CRUD entry when a client never saw the
    // original upload ack. The replay must be treated as already-applied,
    // not recorded as a spurious GENERATOR_ALREADY_ACTIVE rejection.
    await seedSession(testDb.db)
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'insert',
        id: IDS.session,
        data: { generator_id: IDS.generator }
      })
    )
    expect(result.ok).toBe(true)

    // The original row is untouched — no duplicate inserted.
    const rows = await testDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.generatorId, IDS.generator))
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(IDS.session)
  })

  it('update: rejects stopping an already-stopped session with SESSION_ALREADY_STOPPED', async () => {
    await seedSession(testDb.db, IDS.admin, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'update',
        id: IDS.session,
        data: { stopped_at: '2026-01-15T14:00:00Z' }
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('SESSION_ALREADY_STOPPED')
  })

  it('update: rejects editing an active session with CANNOT_EDIT_ACTIVE_SESSION', async () => {
    await seedSession(testDb.db)
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'update',
        id: IDS.session,
        data: {
          started_at: '2026-01-15T10:00:00Z',
          stopped_at: '2026-01-15T11:00:00Z'
        }
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('CANNOT_EDIT_ACTIVE_SESSION')
  })

  it('update: rejects editing a stopped session with START_BEFORE_END', async () => {
    await seedSession(testDb.db, IDS.admin, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'update',
        id: IDS.session,
        data: {
          started_at: '2026-01-15T11:00:00Z',
          stopped_at: '2026-01-15T11:00:00Z'
        }
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('START_BEFORE_END')
  })

  it('update: rejects editing a stopped session with END_TIME_IN_FUTURE', async () => {
    await seedSession(testDb.db, IDS.admin, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'update',
        id: IDS.session,
        data: {
          started_at: '2026-01-15T10:00:00Z',
          stopped_at: '2099-01-15T11:00:00Z'
        }
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('END_TIME_IN_FUTURE')
  })

  it('update: accepts editing a stopped session with valid times', async () => {
    await seedSession(testDb.db, IDS.admin, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    const result = await handleGeneratorSessions(
      makeCtx({
        op: 'update',
        id: IDS.session,
        data: {
          started_at: '2026-01-15T09:00:00Z',
          stopped_at: '2026-01-15T11:00:00Z'
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.startedAt.toISOString()).toBe('2026-01-15T09:00:00.000Z')
    expect(row!.stoppedAt!.toISOString()).toBe('2026-01-15T11:00:00.000Z')
  })
})

// ── handleMaintenanceTemplates ──────────────────────────────────────────────

describe('handleMaintenanceTemplates', () => {
  it('insert: admin creates', async () => {
    const newId = crypto.randomUUID()
    const result = await handleMaintenanceTemplates(
      makeCtx({
        op: 'insert',
        id: newId,
        data: {
          generator_id: IDS.generator,
          task_name: 'Oil change',
          trigger_type: 'hours',
          trigger_hours_interval: '100',
          is_one_time: 0
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, newId)
    })
    expect(row!.taskName).toBe('Oil change')
  })

  it('update: admin updates', async () => {
    await seedTemplate(testDb.db)
    const result = await handleMaintenanceTemplates(
      makeCtx({
        op: 'update',
        id: IDS.template,
        data: { task_name: 'Updated Oil' }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, IDS.template)
    })
    expect(row!.taskName).toBe('Updated Oil')
  })

  it('rejects non-admin insert and creates no template', async () => {
    const newId = crypto.randomUUID()
    const result = await handleMaintenanceTemplates(
      makeCtx({
        op: 'insert',
        id: newId,
        userId: IDS.member,
        data: {
          generator_id: IDS.generator,
          task_name: 'Nope',
          trigger_type: 'hours',
          trigger_hours_interval: '100',
          is_one_time: 0
        }
      })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, newId)
    })
    expect(row).toBeUndefined()
  })

  it('rejects non-admin delete and leaves the template intact', async () => {
    await seedTemplate(testDb.db)
    const result = await handleMaintenanceTemplates(
      makeCtx({ op: 'delete', id: IDS.template, userId: IDS.member })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, IDS.template)
    })
    expect(row).toBeDefined()
  })

  it('update: template not found', async () => {
    const result = await handleMaintenanceTemplates(
      makeCtx({ op: 'update', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(false)
  })

  it('rejects non-admin update and leaves the template intact', async () => {
    await seedTemplate(testDb.db)
    const result = await handleMaintenanceTemplates(
      makeCtx({
        op: 'update',
        id: IDS.template,
        userId: IDS.member,
        data: { task_name: 'Hacked' }
      })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, IDS.template)
    })
    expect(row!.taskName).not.toBe('Hacked')
  })

  it('update: no-ops with empty data', async () => {
    await seedTemplate(testDb.db)
    const result = await handleMaintenanceTemplates(
      makeCtx({ op: 'update', id: IDS.template, data: {} })
    )
    expect(result.ok).toBe(true)
  })

  it('delete: admin deletes', async () => {
    await seedTemplate(testDb.db)
    const result = await handleMaintenanceTemplates(
      makeCtx({ op: 'delete', id: IDS.template })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.maintenanceTemplates.findFirst({
      where: eq(maintenanceTemplates.id, IDS.template)
    })
    expect(row).toBeUndefined()
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleMaintenanceTemplates(
      makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  // PG CHECK constraint: trigger_fields_match_type
  it('insert: PG rejects mismatched trigger fields via CHECK constraint', async () => {
    const newId = crypto.randomUUID()
    const result = handleMaintenanceTemplates(
      makeCtx({
        op: 'insert',
        id: newId,
        data: {
          generator_id: IDS.generator,
          task_name: 'Bad template',
          trigger_type: 'hours',
          // trigger_hours_interval is missing — CHECK constraint should reject
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects empty task name via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: '  ',
          trigger_type: 'hours',
          trigger_hours_interval: '100',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects non-positive trigger_hours_interval via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: 'Oil change',
          trigger_type: 'hours',
          trigger_hours_interval: '0',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects calendar type missing calendar_days via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: 'Filter change',
          trigger_type: 'calendar',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects whichever_first missing hours_interval via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: 'Full service',
          trigger_type: 'whichever_first',
          trigger_calendar_days: '30',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects whichever_first missing calendar_days via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: 'Full service',
          trigger_type: 'whichever_first',
          trigger_hours_interval: '100',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('insert: PG rejects non-positive trigger_calendar_days via CHECK constraint', async () => {
    const result = handleMaintenanceTemplates(
      makeCtx({
        op: 'insert',
        data: {
          generator_id: IDS.generator,
          task_name: 'Filter change',
          trigger_type: 'calendar',
          trigger_calendar_days: '0',
          is_one_time: 0
        }
      })
    )
    await expect(result).rejects.toThrow()
  })
})

// ── handleMaintenanceRecords ────────────────────────────────────────────────

describe('handleMaintenanceRecords', () => {
  beforeEach(async () => {
    await seedTemplate(testDb.db)
  })

  // SECURITY: performedByUserId forced to caller
  it('insert: forces performedByUserId to caller', async () => {
    const newId = crypto.randomUUID()
    const result = await handleMaintenanceRecords(
      makeCtx({
        op: 'insert',
        id: newId,
        data: {
          template_id: IDS.template,
          generator_id: IDS.generator,
          performed_by_user_id: IDS.outsider
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, newId)
    })
    expect(row!.performedByUserId).toBe(IDS.admin) // forced to caller
  })

  it('rejects outsider insert and creates no record', async () => {
    const result = await handleMaintenanceRecords(
      makeCtx({
        op: 'insert',
        userId: IDS.outsider,
        data: {
          template_id: IDS.template,
          generator_id: IDS.generator
        }
      })
    )
    expect(result.ok).toBe(false)

    const rows = await testDb.db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.generatorId, IDS.generator))
    expect(rows).toHaveLength(0)
  })

  it('update: record found, has access', async () => {
    await seedRecord(testDb.db)
    const result = await handleMaintenanceRecords(
      makeCtx({ op: 'update', id: IDS.record, data: { notes: 'test note' } })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row!.notes).toBe('test note')
  })

  it('update: record not found', async () => {
    const result = await handleMaintenanceRecords(
      makeCtx({ op: 'update', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(false)
  })

  // SECURITY: only notes is updatable
  it('update: only notes is updatable, other fields dropped', async () => {
    await seedRecord(testDb.db)
    const result = await handleMaintenanceRecords(
      makeCtx({
        op: 'update',
        id: IDS.record,
        data: {
          notes: 'legit note',
          generator_id: crypto.randomUUID(),
          performed_by_user_id: IDS.outsider
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row!.notes).toBe('legit note')
    expect(row!.generatorId).toBe(IDS.generator) // unchanged
    expect(row!.performedByUserId).toBe(IDS.admin) // unchanged
  })

  it('update: notes null', async () => {
    await seedRecord(testDb.db)
    // First set notes
    await handleMaintenanceRecords(
      makeCtx({ op: 'update', id: IDS.record, data: { notes: 'something' } })
    )
    // Then null it
    await handleMaintenanceRecords(
      makeCtx({ op: 'update', id: IDS.record, data: { notes: null } })
    )
    const row = await testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row!.notes).toBeNull()
  })

  it('update: notes non-string coerced via String()', async () => {
    await seedRecord(testDb.db)
    await handleMaintenanceRecords(
      makeCtx({ op: 'update', id: IDS.record, data: { notes: 123 } })
    )
    const row = await testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row!.notes).toBe('123')
  })

  it('rejects outsider update and leaves the record intact', async () => {
    await seedRecord(testDb.db)
    const result = await handleMaintenanceRecords(
      makeCtx({
        op: 'update',
        id: IDS.record,
        userId: IDS.outsider,
        data: { notes: 'Hacked' }
      })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row!.notes).not.toBe('Hacked')
  })

  it('rejects outsider delete and leaves the record intact', async () => {
    await seedRecord(testDb.db)
    const result = await handleMaintenanceRecords(
      makeCtx({ op: 'delete', id: IDS.record, userId: IDS.outsider })
    )
    expect(result.ok).toBe(false)

    const row = await testDb.db.query.maintenanceRecords.findFirst({
      where: eq(maintenanceRecords.id, IDS.record)
    })
    expect(row).toBeDefined()
  })

  it("delete: admin can delete anyone's record", async () => {
    await seedRecord(testDb.db, IDS.member)
    const result = await handleMaintenanceRecords(
      makeCtx({ op: 'delete', id: IDS.record })
    )
    expect(result.ok).toBe(true)
  })

  it('delete: non-admin can delete own record', async () => {
    await seedRecord(testDb.db, IDS.member)
    await seedAssignment(testDb.db)
    const result = await handleMaintenanceRecords(
      makeCtx({ op: 'delete', id: IDS.record, userId: IDS.member })
    )
    expect(result.ok).toBe(true)
  })

  it("delete: non-admin cannot delete other's record", async () => {
    await seedRecord(testDb.db, IDS.admin)
    await seedAssignment(testDb.db)
    const result = await handleMaintenanceRecords(
      makeCtx({ op: 'delete', id: IDS.record, userId: IDS.member })
    )
    expect(result.ok).toBe(false)
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleMaintenanceRecords(
      makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })
})
