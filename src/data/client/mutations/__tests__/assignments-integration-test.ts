import { and, eq } from 'drizzle-orm'

import { generatorUserAssignments } from '@/data/client/db-schema/generators'

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

import {
  assignUserToGenerator,
  unassignUserFromGenerator
} from '../assignments'

beforeEach(() => {
  resetDatabase(mockTestDb.sqlite)
  mockIdCounter = 0
  seedBaseScenario(mockTestDb.db)
  seedGenerator(mockTestDb.db)
})

afterAll(() => closeDatabase(mockTestDb.sqlite))

// ── assignUserToGenerator ───────────────────────────────────────────────────

describe('assignUserToGenerator', () => {
  it('admin assigns a member', async () => {
    const result = await assignUserToGenerator(
      IDS.adminUser,
      IDS.generator,
      IDS.memberUser
    )
    expect(result.ok).toBe(true)

    const rows = mockTestDb.db
      .select()
      .from(generatorUserAssignments)
      .where(eq(generatorUserAssignments.generatorId, IDS.generator))
      .all()
    expect(rows).toHaveLength(1)
    expect(rows[0].userId).toBe(IDS.memberUser)
  })

  it('admin assigns self (no membership check needed)', async () => {
    const result = await assignUserToGenerator(
      IDS.adminUser,
      IDS.generator,
      IDS.adminUser
    )
    expect(result.ok).toBe(true)
  })

  it('fails when non-admin tries to assign', async () => {
    const result = await assignUserToGenerator(
      IDS.memberUser,
      IDS.generator,
      IDS.memberUser
    )
    expect(result.ok).toBe(false)
  })

  it('fails when target user is not an org member', async () => {
    const result = await assignUserToGenerator(
      IDS.adminUser,
      IDS.generator,
      IDS.outsiderUser
    )
    expect(result.ok).toBe(false)
  })

  it('fails when user already assigned', async () => {
    seedAssignment(mockTestDb.db)
    const result = await assignUserToGenerator(
      IDS.adminUser,
      IDS.generator,
      IDS.memberUser
    )
    expect(result.ok).toBe(false)
  })

  it('fails when generator does not exist', async () => {
    const result = await assignUserToGenerator(
      IDS.adminUser,
      'nonexistent',
      IDS.memberUser
    )
    expect(result.ok).toBe(false)
  })
})

// ── unassignUserFromGenerator ───────────────────────────────────────────────

describe('unassignUserFromGenerator', () => {
  it('admin unassigns a member', async () => {
    seedAssignment(mockTestDb.db)
    const result = await unassignUserFromGenerator(
      IDS.adminUser,
      IDS.generator,
      IDS.memberUser
    )
    expect(result.ok).toBe(true)

    const [row] = mockTestDb.db
      .select()
      .from(generatorUserAssignments)
      .where(
        and(
          eq(generatorUserAssignments.generatorId, IDS.generator),
          eq(generatorUserAssignments.userId, IDS.memberUser)
        )
      )
      .all()
    expect(row).toBeUndefined()
  })

  it('fails when non-admin tries to unassign', async () => {
    seedAssignment(mockTestDb.db)
    const result = await unassignUserFromGenerator(
      IDS.memberUser,
      IDS.generator,
      IDS.memberUser
    )
    expect(result.ok).toBe(false)
  })

  it('fails when user is not assigned', async () => {
    const result = await unassignUserFromGenerator(
      IDS.adminUser,
      IDS.generator,
      IDS.memberUser
    )
    expect(result.ok).toBe(false)
  })

  it('fails when generator does not exist', async () => {
    const result = await unassignUserFromGenerator(
      IDS.adminUser,
      'nonexistent',
      IDS.memberUser
    )
    expect(result.ok).toBe(false)
  })
})
