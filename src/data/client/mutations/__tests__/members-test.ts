import {
  mockDatabase,
  mockSelectChain,
  mockSelectChainSequence
} from './mock-db'

jest.mock('@/lib/powersync/database', () => mockDatabase())

const mockIsOrgAdmin = jest.fn()
jest.mock('../helpers', () => ({
  ...jest.requireActual('../helpers'),
  isOrgAdmin: (...args: unknown[]) => mockIsOrgAdmin(...args)
}))

const { db } = require('@/lib/powersync/database') as ReturnType<
  typeof mockDatabase
>

import { removeMember, leaveOrganization } from '../members'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('removeMember', () => {
  it('succeeds when admin and member found', async () => {
    // First select: get member
    // Second select: assignments in reassignAndRemoveMember (none)
    mockSelectChainSequence(db, [
      [
        {
          id: 'member-1',
          userId: 'user-2',
          organizationId: 'org-1'
        }
      ],
      []
    ])
    mockIsOrgAdmin.mockResolvedValue(true)

    const result = await removeMember('admin-1', 'member-1')
    expect(result.ok).toBe(true)
  })

  it('fails when member not found', async () => {
    mockSelectChain(db, [])

    const result = await removeMember('admin-1', 'member-1')
    expect(result.ok).toBe(false)
  })

  it('fails when not admin', async () => {
    mockSelectChain(db, [
      {
        id: 'member-1',
        userId: 'user-2',
        organizationId: 'org-1'
      }
    ])
    mockIsOrgAdmin.mockResolvedValue(false)

    const result = await removeMember('user-1', 'member-1')
    expect(result.ok).toBe(false)
  })
})

describe('leaveOrganization', () => {
  it('succeeds when non-admin member', async () => {
    mockIsOrgAdmin.mockResolvedValue(false)

    // First select: get membership
    // Second select: get org admin
    // Third select: assignments query in reassignAndRemoveMember (none)
    mockSelectChainSequence(db, [
      [{ id: 'member-1' }],
      [{ adminUserId: 'admin-1' }],
      []
    ])

    const result = await leaveOrganization('user-2', 'org-1')
    expect(result.ok).toBe(true)
  })

  it('fails when user is admin', async () => {
    mockIsOrgAdmin.mockResolvedValue(true)

    const result = await leaveOrganization('admin-1', 'org-1')
    expect(result.ok).toBe(false)
  })

  it('fails when not a member', async () => {
    mockIsOrgAdmin.mockResolvedValue(false)
    mockSelectChain(db, []) // no membership found

    const result = await leaveOrganization('user-2', 'org-1')
    expect(result.ok).toBe(false)
  })

  it('fails when organization not found', async () => {
    mockIsOrgAdmin.mockResolvedValue(false)
    mockSelectChainSequence(db, [
      [{ id: 'member-1' }], // membership found
      [] // organization not found
    ])

    const result = await leaveOrganization('user-2', 'org-1')
    expect(result.ok).toBe(false)
  })
})
