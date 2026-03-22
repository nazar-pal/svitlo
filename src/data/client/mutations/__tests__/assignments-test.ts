import {
  mockDatabase,
  mockSelectChain,
  mockSelectChainSequence,
  mockInsertChain,
  mockDeleteChain
} from './mock-db'

jest.mock('@/lib/powersync/database', () => mockDatabase())

const mockIsOrgAdmin = jest.fn()
const mockGetGeneratorOrg = jest.fn()
jest.mock('../helpers', () => ({
  ...jest.requireActual('../helpers'),
  isOrgAdmin: (...args: unknown[]) => mockIsOrgAdmin(...args),
  getGeneratorOrg: (...args: unknown[]) => mockGetGeneratorOrg(...args)
}))

const { db } = require('@/lib/powersync/database') as ReturnType<
  typeof mockDatabase
>

import {
  assignUserToGenerator,
  unassignUserFromGenerator
} from '../assignments'

beforeEach(() => {
  jest.resetAllMocks()
})

describe('assignUserToGenerator', () => {
  it('succeeds when admin, target is org member, not already assigned', async () => {
    mockGetGeneratorOrg.mockResolvedValue({ organizationId: 'org-1' })
    mockIsOrgAdmin.mockResolvedValue(true)

    // First select: target is org member
    // Second select: no existing assignment
    mockSelectChainSequence(db, [[{ id: 'member-1' }], []])
    mockInsertChain(db)

    const result = await assignUserToGenerator('admin-1', 'gen-1', 'user-2')
    expect(result.ok).toBe(true)
  })

  it('fails when generator not found', async () => {
    mockGetGeneratorOrg.mockResolvedValue(null)

    const result = await assignUserToGenerator('admin-1', 'gen-1', 'user-2')
    expect(result.ok).toBe(false)
  })

  it('fails when not admin', async () => {
    mockGetGeneratorOrg.mockResolvedValue({ organizationId: 'org-1' })
    mockIsOrgAdmin.mockResolvedValue(false)

    const result = await assignUserToGenerator('user-1', 'gen-1', 'user-2')
    expect(result.ok).toBe(false)
  })

  it('fails when target is not an org member', async () => {
    mockGetGeneratorOrg.mockResolvedValue({ organizationId: 'org-1' })
    mockIsOrgAdmin.mockResolvedValue(true)
    mockSelectChain(db, []) // target not a member

    const result = await assignUserToGenerator('admin-1', 'gen-1', 'user-2')
    expect(result.ok).toBe(false)
  })

  it('skips membership check when admin assigns to themselves', async () => {
    mockGetGeneratorOrg.mockResolvedValue({ organizationId: 'org-1' })
    mockIsOrgAdmin.mockResolvedValue(true)
    // Only one select: no existing assignment (membership check skipped)
    mockSelectChain(db, [])
    mockInsertChain(db)

    const result = await assignUserToGenerator('admin-1', 'gen-1', 'admin-1')
    expect(result.ok).toBe(true)
  })

  it('fails when user is already assigned', async () => {
    mockGetGeneratorOrg.mockResolvedValue({ organizationId: 'org-1' })
    mockIsOrgAdmin.mockResolvedValue(true)

    // First select: target is org member
    // Second select: existing assignment
    mockSelectChainSequence(db, [
      [{ id: 'member-1' }],
      [{ id: 'assignment-1' }]
    ])

    const result = await assignUserToGenerator('admin-1', 'gen-1', 'user-2')
    expect(result.ok).toBe(false)
  })
})

describe('unassignUserFromGenerator', () => {
  it('succeeds when admin and assignment exists', async () => {
    mockGetGeneratorOrg.mockResolvedValue({ organizationId: 'org-1' })
    mockIsOrgAdmin.mockResolvedValue(true)
    mockSelectChain(db, [{ id: 'assignment-1' }])
    mockDeleteChain(db)

    const result = await unassignUserFromGenerator('admin-1', 'gen-1', 'user-2')
    expect(result.ok).toBe(true)
  })

  it('fails when generator not found', async () => {
    mockGetGeneratorOrg.mockResolvedValue(null)

    const result = await unassignUserFromGenerator('admin-1', 'gen-1', 'user-2')
    expect(result.ok).toBe(false)
  })

  it('fails when not admin', async () => {
    mockGetGeneratorOrg.mockResolvedValue({ organizationId: 'org-1' })
    mockIsOrgAdmin.mockResolvedValue(false)

    const result = await unassignUserFromGenerator('user-1', 'gen-1', 'user-2')
    expect(result.ok).toBe(false)
  })

  it('fails when assignment does not exist', async () => {
    mockGetGeneratorOrg.mockResolvedValue({ organizationId: 'org-1' })
    mockIsOrgAdmin.mockResolvedValue(true)
    mockSelectChain(db, [])

    const result = await unassignUserFromGenerator('admin-1', 'gen-1', 'user-2')
    expect(result.ok).toBe(false)
  })
})
