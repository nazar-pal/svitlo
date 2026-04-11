import { and, eq } from 'drizzle-orm'

import { generatorUserAssignments } from '@/data/client/db-schema/generators'
import { organizationMembers } from '@/data/client/db-schema/organizations'

import { setupMutationHarness } from './harness'
import { IDS, seedBaseScenario, seedGenerator, seedAssignment } from './seed'

const h = setupMutationHarness()
const { removeMember, leaveOrganization } = h.mutations.members

beforeEach(() => {
  seedBaseScenario(h.db)
  seedGenerator(h.db)
})

// ── removeMember ────────────────────────────────────────────────────────────

describe('removeMember', () => {
  it('admin removes a member and deletes membership', async () => {
    const result = await removeMember(IDS.adminUser, IDS.membership)
    expect(result.ok).toBe(true)

    const [row] = h.db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.id, IDS.membership))
      .all()
    expect(row).toBeUndefined()
  })

  it('reassigns member generator assignments to admin', async () => {
    seedAssignment(h.db) // memberUser assigned to generator
    const result = await removeMember(IDS.adminUser, IDS.membership)
    expect(result.ok).toBe(true)

    // Member assignment deleted
    const [memberAssignment] = h.db
      .select()
      .from(generatorUserAssignments)
      .where(eq(generatorUserAssignments.userId, IDS.memberUser))
      .all()
    expect(memberAssignment).toBeUndefined()

    // Admin now assigned to generator
    const [adminAssignment] = h.db
      .select()
      .from(generatorUserAssignments)
      .where(
        and(
          eq(generatorUserAssignments.userId, IDS.adminUser),
          eq(generatorUserAssignments.generatorId, IDS.generator)
        )
      )
      .all()
    expect(adminAssignment).toBeDefined()
  })

  it('does not create duplicate admin assignment if admin already assigned', async () => {
    // Assign both member and admin to the generator
    seedAssignment(h.db) // memberUser
    h.db
      .insert(generatorUserAssignments)
      .values({
        id: 'assign-admin',
        generatorId: IDS.generator,
        userId: IDS.adminUser,
        assignedAt: '2026-01-15T12:00:00Z'
      })
      .run()

    const result = await removeMember(IDS.adminUser, IDS.membership)
    expect(result.ok).toBe(true)

    // Should be exactly 1 assignment for admin (no duplicate)
    const adminAssignments = h.db
      .select()
      .from(generatorUserAssignments)
      .where(
        and(
          eq(generatorUserAssignments.userId, IDS.adminUser),
          eq(generatorUserAssignments.generatorId, IDS.generator)
        )
      )
      .all()
    expect(adminAssignments).toHaveLength(1)
  })

  it('fails when member does not exist', async () => {
    const result = await removeMember(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })

  it('rejects non-admin and leaves the membership intact', async () => {
    const result = await removeMember(IDS.memberUser, IDS.membership)
    expect(result.ok).toBe(false)

    const [row] = h.db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.id, IDS.membership))
      .all()
    expect(row).toBeDefined()
  })
})

// ── leaveOrganization ───────────────────────────────────────────────────────

describe('leaveOrganization', () => {
  it('member leaves and membership is deleted', async () => {
    const result = await leaveOrganization(IDS.memberUser, IDS.org)
    expect(result.ok).toBe(true)

    const [row] = h.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, IDS.memberUser),
          eq(organizationMembers.organizationId, IDS.org)
        )
      )
      .all()
    expect(row).toBeUndefined()
  })

  it('reassigns member generator assignments to admin on leave', async () => {
    seedAssignment(h.db)
    const result = await leaveOrganization(IDS.memberUser, IDS.org)
    expect(result.ok).toBe(true)

    // Admin now assigned
    const [adminAssignment] = h.db
      .select()
      .from(generatorUserAssignments)
      .where(
        and(
          eq(generatorUserAssignments.userId, IDS.adminUser),
          eq(generatorUserAssignments.generatorId, IDS.generator)
        )
      )
      .all()
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
