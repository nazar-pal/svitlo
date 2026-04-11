import { and, eq } from 'drizzle-orm'

import { generatorUserAssignments } from '@/data/client/db-schema/generators'

import { setupMutationHarness } from './harness'
import { IDS, seedBaseScenario, seedGenerator, seedAssignment } from './seed'

const h = setupMutationHarness()
const { assignUserToGenerator, unassignUserFromGenerator } =
  h.mutations.assignments

beforeEach(() => {
  seedBaseScenario(h.db)
  seedGenerator(h.db)
})

// ── assignUserToGenerator ───────────────────────────────────────────────────

describe('assignUserToGenerator', () => {
  it('admin assigns a member', async () => {
    const result = await assignUserToGenerator(
      IDS.adminUser,
      IDS.generator,
      IDS.memberUser
    )
    expect(result.ok).toBe(true)

    const rows = h.db
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

  it('rejects non-admin and leaves assignments unchanged', async () => {
    const result = await assignUserToGenerator(
      IDS.memberUser,
      IDS.generator,
      IDS.memberUser
    )
    expect(result.ok).toBe(false)

    const rows = h.db
      .select()
      .from(generatorUserAssignments)
      .where(eq(generatorUserAssignments.generatorId, IDS.generator))
      .all()
    expect(rows).toHaveLength(0)
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
    seedAssignment(h.db)
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
    seedAssignment(h.db)
    const result = await unassignUserFromGenerator(
      IDS.adminUser,
      IDS.generator,
      IDS.memberUser
    )
    expect(result.ok).toBe(true)

    const [row] = h.db
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

  it('rejects non-admin and leaves the assignment intact', async () => {
    seedAssignment(h.db)
    const result = await unassignUserFromGenerator(
      IDS.memberUser,
      IDS.generator,
      IDS.memberUser
    )
    expect(result.ok).toBe(false)

    const [row] = h.db
      .select()
      .from(generatorUserAssignments)
      .where(
        and(
          eq(generatorUserAssignments.generatorId, IDS.generator),
          eq(generatorUserAssignments.userId, IDS.memberUser)
        )
      )
      .all()
    expect(row).toBeDefined()
  })
})
