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
jest.mock('@/lib/i18n', () => ({ t: (key: string) => key }))
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
  resetDatabase()
  mockIdCounter = 0
  seedBaseScenario(mockTestDb.db)
})

afterAll(() => closeDatabase())

// ── createOrganization ──────────────────────────────────────────────────────

describe('createOrganization', () => {
  it('creates an organization', async () => {
    const result = await createOrganization(IDS.adminUser, {
      name: 'New Org'
    })
    expect(result.ok).toBe(true)

    const rows = mockTestDb.sqlite
      .prepare('SELECT * FROM organizations WHERE name = ?')
      .all('New Org') as { admin_user_id: string }[]
    expect(rows).toHaveLength(1)
    expect(rows[0].admin_user_id).toBe(IDS.adminUser)
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

    const rows = mockTestDb.sqlite
      .prepare('SELECT * FROM invitations WHERE invitee_email = ?')
      .all('new@test.com')
    expect(rows).toHaveLength(1)
  })

  it('fails when non-admin tries to invite', async () => {
    const result = await createInvitation(IDS.memberUser, {
      organizationId: IDS.org,
      inviteeEmail: 'new@test.com'
    })
    expect(result.ok).toBe(false)
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
    const member = mockTestDb.sqlite
      .prepare(
        'SELECT * FROM organization_members WHERE user_id = ? AND organization_id = ?'
      )
      .get(IDS.outsiderUser, IDS.org)
    expect(member).toBeDefined()

    // Invitation deleted
    const inv = mockTestDb.sqlite
      .prepare('SELECT * FROM invitations WHERE id = ?')
      .get(IDS.invitation)
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

// ── declineInvitation ───────────────────────────────────────────────────────

describe('declineInvitation', () => {
  it('declines invitation, invitation deleted', async () => {
    seedInvitation(mockTestDb.db, 'outsider@test.com')
    const result = await declineInvitation('outsider@test.com', IDS.invitation)
    expect(result.ok).toBe(true)

    const inv = mockTestDb.sqlite
      .prepare('SELECT * FROM invitations WHERE id = ?')
      .get(IDS.invitation)
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

    const inv = mockTestDb.sqlite
      .prepare('SELECT * FROM invitations WHERE id = ?')
      .get(IDS.invitation)
    expect(inv).toBeUndefined()
  })

  it('fails when non-admin tries to cancel', async () => {
    seedInvitation(mockTestDb.db)
    const result = await cancelInvitation(IDS.memberUser, IDS.invitation)
    expect(result.ok).toBe(false)
  })

  it('fails when invitation does not exist', async () => {
    const result = await cancelInvitation(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })
})

// ── renameOrganization ──────────────────────────────────────────────────────

describe('renameOrganization', () => {
  it('admin renames org', async () => {
    const result = await renameOrganization(IDS.adminUser, IDS.org, {
      name: 'Renamed Org'
    })
    expect(result.ok).toBe(true)

    const org = mockTestDb.sqlite
      .prepare('SELECT * FROM organizations WHERE id = ?')
      .get(IDS.org) as { name: string }
    expect(org.name).toBe('Renamed Org')
  })

  it('fails when non-admin tries to rename', async () => {
    const result = await renameOrganization(IDS.memberUser, IDS.org, {
      name: 'Hacked'
    })
    expect(result.ok).toBe(false)
  })

  it('fails with empty name', async () => {
    const result = await renameOrganization(IDS.adminUser, IDS.org, {
      name: ''
    })
    expect(result.ok).toBe(false)
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
    const org = mockTestDb.sqlite
      .prepare('SELECT * FROM organizations WHERE id = ?')
      .get(IDS.org)
    expect(org).toBeUndefined()

    const members = mockTestDb.sqlite
      .prepare('SELECT * FROM organization_members WHERE organization_id = ?')
      .all(IDS.org)
    expect(members).toHaveLength(0)

    const invs = mockTestDb.sqlite
      .prepare('SELECT * FROM invitations WHERE organization_id = ?')
      .all(IDS.org)
    expect(invs).toHaveLength(0)

    const gens = mockTestDb.sqlite
      .prepare('SELECT * FROM generators WHERE organization_id = ?')
      .all(IDS.org)
    expect(gens).toHaveLength(0)

    const assignments = mockTestDb.sqlite
      .prepare(
        'SELECT * FROM generator_user_assignments WHERE generator_id = ?'
      )
      .all(IDS.generator)
    expect(assignments).toHaveLength(0)

    const sessions = mockTestDb.sqlite
      .prepare('SELECT * FROM generator_sessions WHERE generator_id = ?')
      .all(IDS.generator)
    expect(sessions).toHaveLength(0)

    const templates = mockTestDb.sqlite
      .prepare('SELECT * FROM maintenance_templates WHERE generator_id = ?')
      .all(IDS.generator)
    expect(templates).toHaveLength(0)

    const records = mockTestDb.sqlite
      .prepare('SELECT * FROM maintenance_records WHERE generator_id = ?')
      .all(IDS.generator)
    expect(records).toHaveLength(0)
  })

  it('fails when non-admin tries to delete', async () => {
    const result = await deleteOrganization(IDS.memberUser, IDS.org)
    expect(result.ok).toBe(false)
  })

  it('fails for nonexistent org', async () => {
    const result = await deleteOrganization(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })
})
