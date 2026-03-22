import {
  mockDatabase,
  mockSelectChain,
  mockSelectChainSequence,
  mockInsertChain,
  mockUpdateChain,
  mockDeleteChain
} from './mock-db'

jest.mock('@/lib/powersync/database', () => mockDatabase())

const mockIsOrgAdmin = jest.fn()
jest.mock('../helpers', () => ({
  ...jest.requireActual('../helpers'),
  isOrgAdmin: (...args: unknown[]) => mockIsOrgAdmin(...args)
}))

const { db, powersync } = require('@/lib/powersync/database') as ReturnType<
  typeof mockDatabase
>

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
  jest.resetAllMocks()
})

describe('createOrganization', () => {
  it('succeeds with valid name', async () => {
    mockInsertChain(db)

    const result = await createOrganization('user-1', { name: 'My Org' })
    expect(result.ok).toBe(true)
  })

  it('fails with empty name', async () => {
    const result = await createOrganization('user-1', { name: '' })
    expect(result.ok).toBe(false)
  })
})

describe('createInvitation', () => {
  it('succeeds when admin, valid email, no duplicate', async () => {
    mockIsOrgAdmin.mockResolvedValue(true)
    mockSelectChain(db, []) // no existing invitation
    mockInsertChain(db)

    const result = await createInvitation('admin-1', {
      organizationId: 'org-1',
      inviteeEmail: 'user@example.com'
    })
    expect(result.ok).toBe(true)
  })

  it('fails when not admin', async () => {
    mockIsOrgAdmin.mockResolvedValue(false)

    const result = await createInvitation('user-1', {
      organizationId: 'org-1',
      inviteeEmail: 'user@example.com'
    })
    expect(result.ok).toBe(false)
  })

  it('fails with invalid email', async () => {
    const result = await createInvitation('admin-1', {
      organizationId: 'org-1',
      inviteeEmail: 'not-an-email'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when duplicate invitation exists', async () => {
    mockIsOrgAdmin.mockResolvedValue(true)
    mockSelectChain(db, [{ id: 'inv-1' }]) // existing invitation

    const result = await createInvitation('admin-1', {
      organizationId: 'org-1',
      inviteeEmail: 'user@example.com'
    })
    expect(result.ok).toBe(false)
  })
})

describe('acceptInvitation', () => {
  it('succeeds when invitation found, email matches, not already member', async () => {
    // First select: invitation found
    // Second select: not already a member
    mockSelectChainSequence(db, [
      [
        {
          id: 'inv-1',
          organizationId: 'org-1',
          inviteeEmail: 'user@example.com'
        }
      ],
      []
    ])
    mockInsertChain(db)
    mockDeleteChain(db)

    const result = await acceptInvitation('user-1', 'user@example.com', 'inv-1')
    expect(result.ok).toBe(true)
  })

  it('succeeds with case-insensitive email match', async () => {
    mockSelectChainSequence(db, [
      [
        {
          id: 'inv-1',
          organizationId: 'org-1',
          inviteeEmail: 'User@Example.COM'
        }
      ],
      []
    ])
    mockInsertChain(db)
    mockDeleteChain(db)

    const result = await acceptInvitation('user-1', 'user@example.com', 'inv-1')
    expect(result.ok).toBe(true)
  })

  it('fails when invitation not found', async () => {
    mockSelectChain(db, [])

    const result = await acceptInvitation('user-1', 'user@example.com', 'inv-1')
    expect(result.ok).toBe(false)
  })

  it('fails when email does not match', async () => {
    mockSelectChain(db, [
      {
        id: 'inv-1',
        organizationId: 'org-1',
        inviteeEmail: 'other@example.com'
      }
    ])

    const result = await acceptInvitation('user-1', 'user@example.com', 'inv-1')
    expect(result.ok).toBe(false)
  })

  it('fails when already a member', async () => {
    mockSelectChainSequence(db, [
      [
        {
          id: 'inv-1',
          organizationId: 'org-1',
          inviteeEmail: 'user@example.com'
        }
      ],
      [{ id: 'member-1' }] // already a member
    ])

    const result = await acceptInvitation('user-1', 'user@example.com', 'inv-1')
    expect(result.ok).toBe(false)
  })
})

describe('declineInvitation', () => {
  it('succeeds when invitation found and email matches', async () => {
    mockSelectChain(db, [{ id: 'inv-1', inviteeEmail: 'user@example.com' }])
    mockDeleteChain(db)

    const result = await declineInvitation('user@example.com', 'inv-1')
    expect(result.ok).toBe(true)
  })

  it('fails when invitation not found', async () => {
    mockSelectChain(db, [])

    const result = await declineInvitation('user@example.com', 'inv-1')
    expect(result.ok).toBe(false)
  })

  it('fails when email does not match', async () => {
    mockSelectChain(db, [{ id: 'inv-1', inviteeEmail: 'other@example.com' }])

    const result = await declineInvitation('user@example.com', 'inv-1')
    expect(result.ok).toBe(false)
  })
})

describe('cancelInvitation', () => {
  it('succeeds when admin', async () => {
    mockSelectChain(db, [{ id: 'inv-1', organizationId: 'org-1' }])
    mockIsOrgAdmin.mockResolvedValue(true)
    mockDeleteChain(db)

    const result = await cancelInvitation('admin-1', 'inv-1')
    expect(result.ok).toBe(true)
  })

  it('fails when invitation not found', async () => {
    mockSelectChain(db, [])

    const result = await cancelInvitation('admin-1', 'inv-1')
    expect(result.ok).toBe(false)
  })

  it('fails when not admin', async () => {
    mockSelectChain(db, [{ id: 'inv-1', organizationId: 'org-1' }])
    mockIsOrgAdmin.mockResolvedValue(false)

    const result = await cancelInvitation('user-1', 'inv-1')
    expect(result.ok).toBe(false)
  })
})

describe('renameOrganization', () => {
  it('succeeds when admin with valid name', async () => {
    mockIsOrgAdmin.mockResolvedValue(true)
    mockUpdateChain(db)

    const result = await renameOrganization('admin-1', 'org-1', {
      name: 'New Name'
    })
    expect(result.ok).toBe(true)
  })

  it('fails when not admin', async () => {
    mockIsOrgAdmin.mockResolvedValue(false)

    const result = await renameOrganization('user-1', 'org-1', {
      name: 'New Name'
    })
    expect(result.ok).toBe(false)
  })

  it('fails with empty name', async () => {
    const result = await renameOrganization('admin-1', 'org-1', { name: '' })
    expect(result.ok).toBe(false)
  })
})

describe('deleteOrganization', () => {
  it('succeeds when admin', async () => {
    mockIsOrgAdmin.mockResolvedValue(true)

    const result = await deleteOrganization('admin-1', 'org-1')
    expect(result.ok).toBe(true)
    expect(powersync.writeTransaction).toHaveBeenCalled()
  })

  it('fails when not admin', async () => {
    mockIsOrgAdmin.mockResolvedValue(false)

    const result = await deleteOrganization('user-1', 'org-1')
    expect(result.ok).toBe(false)
  })
})
