import { createTestDatabase, resetDatabase, closeDatabase } from './test-db'
import { IDS, seedBaseScenario, seedGenerator, seedAssignment } from './seed'

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

import { removeMember, leaveOrganization } from '../members'

beforeEach(() => {
  resetDatabase()
  mockIdCounter = 0
  seedBaseScenario(mockTestDb.sqlite)
  seedGenerator(mockTestDb.sqlite)
})

afterAll(() => closeDatabase())

// ── removeMember ────────────────────────────────────────────────────────────

describe('removeMember', () => {
  it('admin removes a member and deletes membership', async () => {
    const result = await removeMember(IDS.adminUser, IDS.membership)
    expect(result.ok).toBe(true)

    const row = mockTestDb.sqlite
      .prepare('SELECT * FROM organization_members WHERE id = ?')
      .get(IDS.membership)
    expect(row).toBeUndefined()
  })

  it('reassigns member generator assignments to admin', async () => {
    seedAssignment(mockTestDb.sqlite) // memberUser assigned to generator
    const result = await removeMember(IDS.adminUser, IDS.membership)
    expect(result.ok).toBe(true)

    // Member assignment deleted
    const memberAssignment = mockTestDb.sqlite
      .prepare('SELECT * FROM generator_user_assignments WHERE user_id = ?')
      .get(IDS.memberUser)
    expect(memberAssignment).toBeUndefined()

    // Admin now assigned to generator
    const adminAssignment = mockTestDb.sqlite
      .prepare(
        'SELECT * FROM generator_user_assignments WHERE user_id = ? AND generator_id = ?'
      )
      .get(IDS.adminUser, IDS.generator)
    expect(adminAssignment).toBeDefined()
  })

  it('does not create duplicate admin assignment if admin already assigned', async () => {
    // Assign both member and admin to the generator
    seedAssignment(mockTestDb.sqlite) // memberUser
    mockTestDb.sqlite.exec(`
      INSERT INTO generator_user_assignments VALUES ('assign-admin', '${IDS.generator}', '${IDS.adminUser}', '2026-01-15T12:00:00Z');
    `)

    const result = await removeMember(IDS.adminUser, IDS.membership)
    expect(result.ok).toBe(true)

    // Should be exactly 1 assignment for admin (no duplicate)
    const adminAssignments = mockTestDb.sqlite
      .prepare(
        'SELECT * FROM generator_user_assignments WHERE user_id = ? AND generator_id = ?'
      )
      .all(IDS.adminUser, IDS.generator)
    expect(adminAssignments).toHaveLength(1)
  })

  it('fails when member does not exist', async () => {
    const result = await removeMember(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })

  it('fails when non-admin tries to remove', async () => {
    const result = await removeMember(IDS.memberUser, IDS.membership)
    expect(result.ok).toBe(false)
  })
})

// ── leaveOrganization ───────────────────────────────────────────────────────

describe('leaveOrganization', () => {
  it('member leaves and membership is deleted', async () => {
    const result = await leaveOrganization(IDS.memberUser, IDS.org)
    expect(result.ok).toBe(true)

    const row = mockTestDb.sqlite
      .prepare(
        'SELECT * FROM organization_members WHERE user_id = ? AND organization_id = ?'
      )
      .get(IDS.memberUser, IDS.org)
    expect(row).toBeUndefined()
  })

  it('reassigns member generator assignments to admin on leave', async () => {
    seedAssignment(mockTestDb.sqlite)
    const result = await leaveOrganization(IDS.memberUser, IDS.org)
    expect(result.ok).toBe(true)

    // Admin now assigned
    const adminAssignment = mockTestDb.sqlite
      .prepare(
        'SELECT * FROM generator_user_assignments WHERE user_id = ? AND generator_id = ?'
      )
      .get(IDS.adminUser, IDS.generator)
    expect(adminAssignment).toBeDefined()
  })

  it('fails when admin tries to leave', async () => {
    const result = await leaveOrganization(IDS.adminUser, IDS.org)
    expect(result.ok).toBe(false)
  })

  it('fails when user is not a member', async () => {
    const result = await leaveOrganization(IDS.outsiderUser, IDS.org)
    expect(result.ok).toBe(false)
  })
})
