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

import { setupMutationHarness } from './harness'
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

const h = setupMutationHarness()

import {
  createOrganization,
  deleteOrganization,
  renameOrganization
} from '../organizations'

beforeEach(() => {
  seedBaseScenario(h.db)
})

// ── createOrganization ──────────────────────────────────────────────────────

describe('createOrganization', () => {
  it('creates an organization', async () => {
    const result = await createOrganization(IDS.adminUser, {
      name: 'New Org'
    })
    expect(result.ok).toBe(true)

    const rows = h.db
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

// ── renameOrganization ──────────────────────────────────────────────────────

describe('renameOrganization', () => {
  it('admin renames org', async () => {
    const result = await renameOrganization(IDS.adminUser, IDS.org, {
      name: 'Renamed Org'
    })
    expect(result.ok).toBe(true)

    const [org] = h.db
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

    const [org] = h.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, IDS.org))
      .all()
    expect(org.name).not.toBe('Hacked')
  })

  it('returns ORGANIZATION_NOT_FOUND when the org does not exist', async () => {
    const result = await renameOrganization(IDS.adminUser, 'nonexistent', {
      name: 'Whatever'
    })
    expect(result).toEqual({
      ok: false,
      error: { code: 'ORGANIZATION_NOT_FOUND' }
    })
  })
})

// ── deleteOrganization ──────────────────────────────────────────────────────

describe('deleteOrganization', () => {
  it('admin deletes org and all related data is cascaded', async () => {
    // Seed all related data
    seedGenerator(h.db)
    seedAssignment(h.db)
    seedActiveSession(h.db)
    seedInvitation(h.db)
    seedMaintenanceTemplate(h.db)
    seedMaintenanceRecord(h.db)

    const result = await deleteOrganization(IDS.adminUser, IDS.org)
    expect(result.ok).toBe(true)

    // All tables should be empty for this org
    const [org] = h.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, IDS.org))
      .all()
    expect(org).toBeUndefined()

    expect(
      h.db
        .select()
        .from(organizationMembers)
        .where(eq(organizationMembers.organizationId, IDS.org))
        .all()
    ).toHaveLength(0)

    expect(
      h.db
        .select()
        .from(invitations)
        .where(eq(invitations.organizationId, IDS.org))
        .all()
    ).toHaveLength(0)

    expect(
      h.db
        .select()
        .from(generators)
        .where(eq(generators.organizationId, IDS.org))
        .all()
    ).toHaveLength(0)

    expect(
      h.db
        .select()
        .from(generatorUserAssignments)
        .where(eq(generatorUserAssignments.generatorId, IDS.generator))
        .all()
    ).toHaveLength(0)

    expect(
      h.db
        .select()
        .from(generatorSessions)
        .where(eq(generatorSessions.generatorId, IDS.generator))
        .all()
    ).toHaveLength(0)

    expect(
      h.db
        .select()
        .from(maintenanceTemplates)
        .where(eq(maintenanceTemplates.generatorId, IDS.generator))
        .all()
    ).toHaveLength(0)

    expect(
      h.db
        .select()
        .from(maintenanceRecords)
        .where(eq(maintenanceRecords.generatorId, IDS.generator))
        .all()
    ).toHaveLength(0)
  })

  it('rejects non-admin and leaves the organization intact', async () => {
    const result = await deleteOrganization(IDS.memberUser, IDS.org)
    expect(result.ok).toBe(false)

    const [org] = h.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, IDS.org))
      .all()
    expect(org).toBeDefined()
  })

  it('returns ORGANIZATION_NOT_FOUND for a nonexistent org (before the admin check)', async () => {
    const result = await deleteOrganization(IDS.adminUser, 'nonexistent')
    expect(result).toEqual({
      ok: false,
      error: { code: 'ORGANIZATION_NOT_FOUND' }
    })
  })
})
