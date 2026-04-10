import { eq } from 'drizzle-orm'

import {
  generators,
  generatorSessions,
  generatorUserAssignments
} from '@/data/client/db-schema/generators'
import {
  maintenanceRecords,
  maintenanceTemplates
} from '@/data/client/db-schema/maintenance'
import {
  invitations,
  organizationMembers,
  organizations
} from '@/data/client/db-schema/organizations'

import { createTestDatabase, resetDatabase, closeDatabase } from './test-db'
import {
  IDS,
  seedBaseScenario,
  seedGenerator,
  seedAssignment,
  seedActiveSession,
  seedInvitation,
  seedMaintenanceTemplate,
  seedMaintenanceRecord
} from './seed'

let mockTestDb: Awaited<ReturnType<typeof createTestDatabase>>

beforeAll(async () => {
  mockTestDb = await createTestDatabase()
})

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockTestDb.db
  },
  get powersync() {
    return mockTestDb.powersync
  }
}))

let mockIdCounter = 0
jest.mock('../helpers', () => ({
  ...jest.requireActual('../helpers'),
  newId: jest.fn(() => `id-${++mockIdCounter}`)
}))

jest.mock('expo-crypto', () => ({ randomUUID: () => 'mock-uuid' }))
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() } }))

import {
  createOrganization,
  createInvitation,
  acceptInvitation,
  declineInvitation,
  cancelInvitation,
  renameOrganization,
  deleteOrganization
} from '../organizations'

beforeEach(() => {
  resetDatabase(mockTestDb.sqlite)
  mockIdCounter = 0
  seedBaseScenario(mockTestDb.db)
})

afterAll(() => closeDatabase(mockTestDb.sqlite))

// ── createOrganization ──────────────────────────────────────────────────────

describe('createOrganization', () => {
  it('creates an organization', async () => {
    const result = await createOrganization(IDS.adminUser, {
      name: 'New Org'
    })
    expect(result.ok).toBe(true)

    const rows = mockTestDb.db
      .select()
      .from(organizations)
      .where(eq(organizations.name, 'New Org'))
      .all()
    expect(rows).toHaveLength(1)
    expect(rows[0].adminUserId).toBe(IDS.adminUser)
  })

  it('fails with empty name', async () => {
    const result = await createOrganization(IDS.adminUser, { name: '' })
    expect(result.ok).toBe(false)
  })

  it('fails with whitespace-only name', async () => {
    const result = await createOrganization(IDS.adminUser, { name: '   ' })
    expect(result.ok).toBe(false)
  })
})

// ── createInvitation ────────────────────────────────────────────────────────

describe('createInvitation', () => {
  it('admin creates an invitation', async () => {
    const result = await createInvitation(IDS.adminUser, {
      organizationId: IDS.org,
      inviteeEmail: 'new@test.com'
    })
    expect(result.ok).toBe(true)

    const rows = mockTestDb.db
      .select()
      .from(invitations)
      .where(eq(invitations.inviteeEmail, 'new@test.com'))
      .all()
    expect(rows).toHaveLength(1)
  })

  it('fails with duplicate invitation', async () => {
    seedInvitation(mockTestDb.db, 'dup@test.com')
    const result = await createInvitation(IDS.adminUser, {
      organizationId: IDS.org,
      inviteeEmail: 'dup@test.com'
    })
    expect(result.ok).toBe(false)
  })

  it('fails with invalid email', async () => {
    const result = await createInvitation(IDS.adminUser, {
      organizationId: IDS.org,
      inviteeEmail: 'not-an-email'
    })
    expect(result.ok).toBe(false)
  })

  it('rejects non-admin and creates no invitation', async () => {
    const result = await createInvitation(IDS.memberUser, {
      organizationId: IDS.org,
      inviteeEmail: 'nope@test.com'
    })
    expect(result.ok).toBe(false)

    const rows = mockTestDb.db
      .select()
      .from(invitations)
      .where(eq(invitations.organizationId, IDS.org))
      .all()
    expect(rows).toHaveLength(0)
  })
})

// ── acceptInvitation ────────────────────────────────────────────────────────

describe('acceptInvitation', () => {
  it('accepts invitation, adds member, deletes invitation', async () => {
    seedInvitation(mockTestDb.db, 'outsider@test.com')
    const result = await acceptInvitation(
      IDS.outsiderUser,
      'outsider@test.com',
      IDS.invitation
    )
    expect(result.ok).toBe(true)

    // Membership created
    const [member] = mockTestDb.db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, IDS.outsiderUser))
      .all()
    expect(member).toBeDefined()

    // Invitation deleted
    const [inv] = mockTestDb.db
      .select()
      .from(invitations)
      .where(eq(invitations.id, IDS.invitation))
      .all()
    expect(inv).toBeUndefined()
  })

  it('accepts with case-insensitive email matching', async () => {
    seedInvitation(mockTestDb.db, 'Outsider@Test.COM')
    const result = await acceptInvitation(
      IDS.outsiderUser,
      'outsider@test.com',
      IDS.invitation
    )
    expect(result.ok).toBe(true)
  })

  it('fails when invitation does not exist', async () => {
    const result = await acceptInvitation(
      IDS.outsiderUser,
      'outsider@test.com',
      'nonexistent'
    )
    expect(result.ok).toBe(false)
  })

  it('fails when email does not match', async () => {
    seedInvitation(mockTestDb.db, 'someone@test.com')
    const result = await acceptInvitation(
      IDS.outsiderUser,
      'wrong@test.com',
      IDS.invitation
    )
    expect(result.ok).toBe(false)
  })

  it('fails when user is already a member', async () => {
    seedInvitation(mockTestDb.db, 'member@test.com')
    const result = await acceptInvitation(
      IDS.memberUser,
      'member@test.com',
      IDS.invitation
    )
    expect(result.ok).toBe(false)
  })
})

// ── declineInvitation ──────────────────────────────────────────────────────

describe('declineInvitation', () => {
  it('declines invitation, invitation deleted', async () => {
    seedInvitation(mockTestDb.db, 'outsider@test.com')
    const result = await declineInvitation('outsider@test.com', IDS.invitation)
    expect(result.ok).toBe(true)

    const [inv] = mockTestDb.db
      .select()
      .from(invitations)
      .where(eq(invitations.id, IDS.invitation))
      .all()
    expect(inv).toBeUndefined()
  })

  it('fails when invitation does not exist', async () => {
    const result = await declineInvitation('outsider@test.com', 'nonexistent')
    expect(result.ok).toBe(false)
  })

  it('fails when email does not match', async () => {
    seedInvitation(mockTestDb.db, 'someone@test.com')
    const result = await declineInvitation('wrong@test.com', IDS.invitation)
    expect(result.ok).toBe(false)
  })
})

// ── cancelInvitation ────────────────────────────────────────────────────────

describe('cancelInvitation', () => {
  it('admin cancels invitation', async () => {
    seedInvitation(mockTestDb.db)
    const result = await cancelInvitation(IDS.adminUser, IDS.invitation)
    expect(result.ok).toBe(true)

    const [inv] = mockTestDb.db
      .select()
      .from(invitations)
      .where(eq(invitations.id, IDS.invitation))
      .all()
    expect(inv).toBeUndefined()
  })

  it('fails when invitation does not exist', async () => {
    const result = await cancelInvitation(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })

  it('rejects non-admin and leaves the invitation intact', async () => {
    seedInvitation(mockTestDb.db)
    const result = await cancelInvitation(IDS.memberUser, IDS.invitation)
    expect(result.ok).toBe(false)

    const [inv] = mockTestDb.db
      .select()
      .from(invitations)
      .where(eq(invitations.id, IDS.invitation))
      .all()
    expect(inv).toBeDefined()
  })
})

// ── renameOrganization ──────────────────────────────────────────────────────

describe('renameOrganization', () => {
  it('admin renames org', async () => {
    const result = await renameOrganization(IDS.adminUser, IDS.org, {
      name: 'Renamed Org'
    })
    expect(result.ok).toBe(true)

    const [org] = mockTestDb.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, IDS.org))
      .all()
    expect(org.name).toBe('Renamed Org')
  })

  it('fails with empty name', async () => {
    const result = await renameOrganization(IDS.adminUser, IDS.org, {
      name: ''
    })
    expect(result.ok).toBe(false)
  })

  it('rejects non-admin and leaves the organization intact', async () => {
    const result = await renameOrganization(IDS.memberUser, IDS.org, {
      name: 'Hacked'
    })
    expect(result.ok).toBe(false)

    const [org] = mockTestDb.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, IDS.org))
      .all()
    expect(org.name).not.toBe('Hacked')
  })
})

// ── deleteOrganization ──────────────────────────────────────────────────────

describe('deleteOrganization', () => {
  it('admin deletes org and all related data is cascaded', async () => {
    // Seed all related data
    seedGenerator(mockTestDb.db)
    seedAssignment(mockTestDb.db)
    seedActiveSession(mockTestDb.db)
    seedInvitation(mockTestDb.db)
    seedMaintenanceTemplate(mockTestDb.db)
    seedMaintenanceRecord(mockTestDb.db)

    const result = await deleteOrganization(IDS.adminUser, IDS.org)
    expect(result.ok).toBe(true)

    // All tables should be empty for this org
    const [org] = mockTestDb.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, IDS.org))
      .all()
    expect(org).toBeUndefined()

    expect(
      mockTestDb.db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, IDS.org))
        .all()
    ).toHaveLength(0)

    expect(
      mockTestDb.db
        .select()
        .from(invitations)
        .where(eq(invitations.organizationId, IDS.org))
        .all()
    ).toHaveLength(0)

    expect(
      mockTestDb.db
        .select()
        .from(generators)
        .where(eq(generators.organizationId, IDS.org))
        .all()
    ).toHaveLength(0)

    expect(
      mockTestDb.db
        .select()
        .from(generatorUserAssignments)
        .where(eq(generatorUserAssignments.generatorId, IDS.generator))
        .all()
    ).toHaveLength(0)

    expect(
      mockTestDb.db
        .select()
        .from(generatorSessions)
        .where(eq(generatorSessions.generatorId, IDS.generator))
        .all()
    ).toHaveLength(0)

    expect(
      mockTestDb.db
        .select()
        .from(maintenanceTemplates)
        .where(eq(maintenanceTemplates.generatorId, IDS.generator))
        .all()
    ).toHaveLength(0)

    expect(
      mockTestDb.db
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.generatorId, IDS.generator))
        .all()
    ).toHaveLength(0)
  })

  it('rejects non-admin and leaves the organization intact', async () => {
    const result = await deleteOrganization(IDS.memberUser, IDS.org)
    expect(result.ok).toBe(false)

    const [org] = mockTestDb.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, IDS.org))
      .all()
    expect(org).toBeDefined()
  })

  it('fails for nonexistent org', async () => {
    const result = await deleteOrganization(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })
})
