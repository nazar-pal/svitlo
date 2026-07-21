import {
  IDS,
  seedActiveSession,
  seedAssignment,
  seedBaseScenario,
  seedGenerator,
  seedInvitation,
  seedMaintenanceRecord,
  seedMaintenanceTemplate,
  seedStoppedSession
} from '@/data/client/mutations/__tests__/seed'
import {
  closeDatabase,
  createTestDatabase,
  resetDatabase
} from '@/data/client/mutations/__tests__/test-db'

let mockTestDb: Awaited<ReturnType<typeof createTestDatabase>>

beforeAll(async () => {
  mockTestDb = await createTestDatabase()
})

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockTestDb.db
  }
}))

import { eq } from 'drizzle-orm'

import { organizations } from '@/data/client/db-schema'
import { clientLookup } from '@/data/client/registry'

function lookup(key: string, input: unknown) {
  return clientLookup(mockTestDb.db)(key, input)
}

beforeEach(() => {
  resetDatabase(mockTestDb.sqlite)
  seedBaseScenario(mockTestDb.db)
  seedGenerator(mockTestDb.db)
})

afterAll(() => closeDatabase(mockTestDb.sqlite))

// These tests exercise the client fact registry the decision adapter
// consumes. Each entry has a dialect-specific concern — SQLite `EXISTS`
// returns 0/1, LEFT JOINs can produce null orgAdminUserId for orphan
// generators, case-insensitive email comparison after the registry
// normalises the input — so we run them against the real in-memory
// SQLite db rather than a stub.

// ── generator.* ─────────────────────────────────────────────────────────────

describe('registry: generator.byId', () => {
  it('returns the row for an existing id', async () => {
    expect(await lookup('generator.byId', IDS.generator)).toEqual({
      id: IDS.generator
    })
  })

  it('returns null for a nonexistent id', async () => {
    expect(await lookup('generator.byId', 'nope')).toBeNull()
  })
})

describe('registry: generator.orgId', () => {
  it('returns the organizationId for an existing generator', async () => {
    expect(await lookup('generator.orgId', IDS.generator)).toBe(IDS.org)
  })

  it('returns null for a nonexistent generator', async () => {
    expect(await lookup('generator.orgId', 'nope')).toBeNull()
  })
})

// ── session.* ───────────────────────────────────────────────────────────────

describe('registry: session.byId', () => {
  it('returns an existing session projection', async () => {
    seedActiveSession(mockTestDb.db)
    expect(await lookup('session.byId', IDS.session.active)).toEqual({
      generatorId: IDS.generator,
      startedByUserId: IDS.adminUser,
      isStopped: false
    })
  })

  it('returns null for a nonexistent session', async () => {
    expect(await lookup('session.byId', 'nope')).toBeNull()
  })
})

describe('registry: session.hasOpenForGenerator', () => {
  it('returns true while an open session exists', async () => {
    seedActiveSession(mockTestDb.db)
    expect(await lookup('session.hasOpenForGenerator', IDS.generator)).toBe(
      true
    )
  })

  it('returns false when only stopped sessions exist', async () => {
    seedStoppedSession(mockTestDb.db)
    expect(await lookup('session.hasOpenForGenerator', IDS.generator)).toBe(
      false
    )
  })
})

// ── authz.* ─────────────────────────────────────────────────────────────────

describe('registry: authz.generator', () => {
  it('coerces the EXISTS subquery to a real boolean (no assignment)', async () => {
    expect(
      await lookup('authz.generator', {
        userId: IDS.memberUser,
        generatorId: IDS.generator
      })
    ).toEqual({ orgAdminUserId: IDS.adminUser, hasAssignment: false })
  })

  it('coerces the EXISTS subquery to a real boolean (with assignment)', async () => {
    seedAssignment(mockTestDb.db)
    expect(
      await lookup('authz.generator', {
        userId: IDS.memberUser,
        generatorId: IDS.generator
      })
    ).toEqual({ orgAdminUserId: IDS.adminUser, hasAssignment: true })
  })

  it('returns null for a nonexistent generator', async () => {
    expect(
      await lookup('authz.generator', {
        userId: IDS.memberUser,
        generatorId: 'nope'
      })
    ).toBeNull()
  })

  // The client schema is FK-agnostic, so deleting the org row directly
  // exercises the LEFT JOIN orphan-generator path.
  it('returns orgAdminUserId: null when the generator is orphaned (LEFT JOIN)', async () => {
    mockTestDb.db
      .delete(organizations)
      .where(eq(organizations.id, IDS.org))
      .run()
    expect(
      await lookup('authz.generator', {
        userId: IDS.memberUser,
        generatorId: IDS.generator
      })
    ).toEqual({ orgAdminUserId: null, hasAssignment: false })
  })
})

describe('registry: authz.org', () => {
  it('returns the admin for an existing org', async () => {
    expect(await lookup('authz.org', IDS.org)).toEqual({
      adminUserId: IDS.adminUser
    })
  })

  it('returns null when the org does not exist', async () => {
    expect(await lookup('authz.org', 'nope')).toBeNull()
  })
})

// ── assignment.* ────────────────────────────────────────────────────────────

describe('registry: assignment.hasForUserAndGenerator', () => {
  it('returns true when the user is assigned', async () => {
    seedAssignment(mockTestDb.db)
    expect(
      await lookup('assignment.hasForUserAndGenerator', {
        userId: IDS.memberUser,
        generatorId: IDS.generator
      })
    ).toBe(true)
  })

  it('returns false otherwise', async () => {
    expect(
      await lookup('assignment.hasForUserAndGenerator', {
        userId: IDS.memberUser,
        generatorId: IDS.generator
      })
    ).toBe(false)
  })
})

// ── orgMembership.* ─────────────────────────────────────────────────────────

describe('registry: orgMembership.byId', () => {
  it('returns the row for an existing membership', async () => {
    const row = await lookup('orgMembership.byId', IDS.membership)
    expect(row).toEqual({
      id: IDS.membership,
      organizationId: IDS.org,
      userId: IDS.memberUser
    })
  })

  it('returns null for a missing id', async () => {
    expect(await lookup('orgMembership.byId', 'nope')).toBeNull()
  })
})

describe('registry: orgMembership.byUserAndOrg', () => {
  it('returns the row when the user is a member', async () => {
    const row = await lookup('orgMembership.byUserAndOrg', {
      userId: IDS.memberUser,
      organizationId: IDS.org
    })
    expect(row).toMatchObject({ userId: IDS.memberUser })
  })

  it('returns null otherwise', async () => {
    expect(
      await lookup('orgMembership.byUserAndOrg', {
        userId: IDS.outsiderUser,
        organizationId: IDS.org
      })
    ).toBeNull()
  })
})

describe('registry: orgMembership.hasForUserAndOrg', () => {
  it('returns true for a matching row', async () => {
    expect(
      await lookup('orgMembership.hasForUserAndOrg', {
        userId: IDS.memberUser,
        organizationId: IDS.org
      })
    ).toBe(true)
  })

  it('returns false otherwise', async () => {
    expect(
      await lookup('orgMembership.hasForUserAndOrg', {
        userId: IDS.outsiderUser,
        organizationId: IDS.org
      })
    ).toBe(false)
  })
})

// ── organization.* ──────────────────────────────────────────────────────────

describe('registry: organization.byId', () => {
  it('returns the row for an existing org', async () => {
    expect(await lookup('organization.byId', IDS.org)).toEqual({
      id: IDS.org,
      adminUserId: IDS.adminUser
    })
  })

  it('returns null for a missing org', async () => {
    expect(await lookup('organization.byId', 'nope')).toBeNull()
  })
})

// ── invitation.* ────────────────────────────────────────────────────────────

describe('registry: invitation.byId', () => {
  it('returns an existing invitation', async () => {
    seedInvitation(mockTestDb.db)
    const row = await lookup('invitation.byId', IDS.invitation)
    expect(row).toMatchObject({ organizationId: IDS.org })
  })

  it('returns null for a nonexistent invitation', async () => {
    expect(await lookup('invitation.byId', 'nope')).toBeNull()
  })
})

describe('registry: invitation.byOrgAndEmail', () => {
  it('returns the invitation for a matching org + email', async () => {
    seedInvitation(mockTestDb.db, 'invitee@test.com')
    const row = await lookup('invitation.byOrgAndEmail', {
      organizationId: IDS.org,
      inviteeEmail: 'invitee@test.com'
    })
    expect(row).toMatchObject({ inviteeEmail: 'invitee@test.com' })
  })

  it('normalises caller-supplied email to lowercase (case-insensitive)', async () => {
    seedInvitation(mockTestDb.db, 'invitee@test.com')
    const row = await lookup('invitation.byOrgAndEmail', {
      organizationId: IDS.org,
      inviteeEmail: '  INVITEE@Test.COM  '
    })
    expect(row).toMatchObject({ inviteeEmail: 'invitee@test.com' })
  })

  it('returns null when no invitation matches', async () => {
    seedInvitation(mockTestDb.db, 'invitee@test.com')
    expect(
      await lookup('invitation.byOrgAndEmail', {
        organizationId: IDS.org,
        inviteeEmail: 'someone.else@test.com'
      })
    ).toBeNull()
  })
})

// ── maintenance* ────────────────────────────────────────────────────────────

describe('registry: maintenanceTemplate.byId', () => {
  it('returns an existing template', async () => {
    seedMaintenanceTemplate(mockTestDb.db)
    const row = await lookup('maintenanceTemplate.byId', IDS.template)
    expect(row).toMatchObject({ generatorId: IDS.generator })
  })

  it('returns null for a missing template', async () => {
    expect(await lookup('maintenanceTemplate.byId', 'nope')).toBeNull()
  })
})

describe('registry: maintenanceRecord.byId', () => {
  it('returns an existing record', async () => {
    seedMaintenanceTemplate(mockTestDb.db)
    seedMaintenanceRecord(mockTestDb.db)
    const row = await lookup('maintenanceRecord.byId', IDS.record)
    expect(row).toMatchObject({ generatorId: IDS.generator })
  })

  it('returns null for a missing record', async () => {
    expect(await lookup('maintenanceRecord.byId', 'nope')).toBeNull()
  })
})
