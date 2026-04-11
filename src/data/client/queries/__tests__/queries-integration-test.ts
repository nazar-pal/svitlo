import {
  closeDatabase,
  createTestDatabase,
  resetDatabase
} from '@/data/client/mutations/__tests__/test-db'
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

let mockTestDb: Awaited<ReturnType<typeof createTestDatabase>>

beforeAll(async () => {
  mockTestDb = await createTestDatabase()
})

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockTestDb.db
  }
}))

import {
  getAssignmentForUserAndGenerator,
  getGeneratorById,
  getGeneratorOrgId,
  getGeneratorSessionById,
  getInvitationById,
  getInvitationByOrgAndEmail,
  getMaintenanceRecordById,
  getMaintenanceTemplateById,
  getOpenSessionForGenerator,
  getOrganizationAdminUserId,
  getOrgMemberById,
  getOrgMembershipById
} from '../index'

beforeEach(() => {
  resetDatabase(mockTestDb.sqlite)
  seedBaseScenario(mockTestDb.db)
  seedGenerator(mockTestDb.db)
})

afterAll(() => closeDatabase(mockTestDb.sqlite))

// ── generators ──────────────────────────────────────────────────────────────

describe('getGeneratorById', () => {
  it('returns the generator row for an existing id', async () => {
    const row = await getGeneratorById(mockTestDb.db, IDS.generator)
    expect(row?.id).toBe(IDS.generator)
    expect(row?.organizationId).toBe(IDS.org)
  })

  it('returns null for a nonexistent id', async () => {
    expect(await getGeneratorById(mockTestDb.db, 'nope')).toBeNull()
  })
})

describe('getGeneratorOrgId', () => {
  it('returns the organizationId for an existing generator', async () => {
    expect(await getGeneratorOrgId(mockTestDb.db, IDS.generator)).toBe(IDS.org)
  })

  it('returns null for a nonexistent generator', async () => {
    expect(await getGeneratorOrgId(mockTestDb.db, 'nope')).toBeNull()
  })
})

describe('getGeneratorSessionById', () => {
  it('returns an existing session', async () => {
    seedActiveSession(mockTestDb.db)
    const row = await getGeneratorSessionById(mockTestDb.db, IDS.session.active)
    expect(row?.id).toBe(IDS.session.active)
  })

  it('returns null for a nonexistent session', async () => {
    expect(await getGeneratorSessionById(mockTestDb.db, 'nope')).toBeNull()
  })
})

describe('getOpenSessionForGenerator', () => {
  it('returns the open session for a running generator', async () => {
    seedActiveSession(mockTestDb.db)
    const row = await getOpenSessionForGenerator(mockTestDb.db, IDS.generator)
    expect(row?.id).toBe(IDS.session.active)
    expect(row?.stoppedAt).toBeNull()
  })

  it('returns null when only stopped sessions exist', async () => {
    seedStoppedSession(mockTestDb.db)
    expect(
      await getOpenSessionForGenerator(mockTestDb.db, IDS.generator)
    ).toBeNull()
  })

  it('returns null when no sessions exist', async () => {
    expect(
      await getOpenSessionForGenerator(mockTestDb.db, IDS.generator)
    ).toBeNull()
  })
})

describe('getAssignmentForUserAndGenerator', () => {
  it('returns the assignment when user is assigned', async () => {
    seedAssignment(mockTestDb.db)
    const row = await getAssignmentForUserAndGenerator(
      mockTestDb.db,
      IDS.memberUser,
      IDS.generator
    )
    expect(row?.userId).toBe(IDS.memberUser)
  })

  it('returns null when user is not assigned', async () => {
    expect(
      await getAssignmentForUserAndGenerator(
        mockTestDb.db,
        IDS.memberUser,
        IDS.generator
      )
    ).toBeNull()
  })
})

// ── organizations ───────────────────────────────────────────────────────────

describe('getOrganizationAdminUserId', () => {
  it('returns the admin user id', async () => {
    expect(await getOrganizationAdminUserId(mockTestDb.db, IDS.org)).toBe(
      IDS.adminUser
    )
  })

  it('returns null for a nonexistent org', async () => {
    expect(await getOrganizationAdminUserId(mockTestDb.db, 'nope')).toBeNull()
  })
})

describe('getOrgMemberById', () => {
  it('returns the membership row when user is a member', async () => {
    const row = await getOrgMemberById(
      mockTestDb.db,
      IDS.memberUser,
      IDS.org
    )
    expect(row?.userId).toBe(IDS.memberUser)
    expect(row?.organizationId).toBe(IDS.org)
  })

  it('returns null when user is not a member', async () => {
    expect(
      await getOrgMemberById(mockTestDb.db, IDS.outsiderUser, IDS.org)
    ).toBeNull()
  })
})

describe('getOrgMembershipById', () => {
  it('returns the membership by its primary id', async () => {
    const row = await getOrgMembershipById(mockTestDb.db, IDS.membership)
    expect(row?.id).toBe(IDS.membership)
  })

  it('returns null for a nonexistent membership', async () => {
    expect(await getOrgMembershipById(mockTestDb.db, 'nope')).toBeNull()
  })
})

describe('getInvitationById', () => {
  it('returns an existing invitation', async () => {
    seedInvitation(mockTestDb.db)
    const row = await getInvitationById(mockTestDb.db, IDS.invitation)
    expect(row?.id).toBe(IDS.invitation)
  })

  it('returns null for a nonexistent invitation', async () => {
    expect(await getInvitationById(mockTestDb.db, 'nope')).toBeNull()
  })
})

describe('getInvitationByOrgAndEmail', () => {
  it('returns the invitation for a matching org + email', async () => {
    seedInvitation(mockTestDb.db, 'invitee@test.com')
    const row = await getInvitationByOrgAndEmail(
      mockTestDb.db,
      IDS.org,
      'invitee@test.com'
    )
    expect(row?.id).toBe(IDS.invitation)
  })

  it('returns null when no invitation matches', async () => {
    seedInvitation(mockTestDb.db, 'invitee@test.com')
    expect(
      await getInvitationByOrgAndEmail(
        mockTestDb.db,
        IDS.org,
        'someone.else@test.com'
      )
    ).toBeNull()
  })
})

// ── maintenance ─────────────────────────────────────────────────────────────

describe('getMaintenanceTemplateById', () => {
  it('returns an existing template', async () => {
    seedMaintenanceTemplate(mockTestDb.db)
    const row = await getMaintenanceTemplateById(mockTestDb.db, IDS.template)
    expect(row?.id).toBe(IDS.template)
    expect(row?.generatorId).toBe(IDS.generator)
  })

  it('returns null for a nonexistent template', async () => {
    expect(await getMaintenanceTemplateById(mockTestDb.db, 'nope')).toBeNull()
  })
})

describe('getMaintenanceRecordById', () => {
  it('returns an existing record', async () => {
    seedMaintenanceTemplate(mockTestDb.db)
    seedMaintenanceRecord(mockTestDb.db)
    const row = await getMaintenanceRecordById(mockTestDb.db, IDS.record)
    expect(row?.id).toBe(IDS.record)
    expect(row?.generatorId).toBe(IDS.generator)
  })

  it('returns null for a nonexistent record', async () => {
    expect(await getMaintenanceRecordById(mockTestDb.db, 'nope')).toBeNull()
  })
})
