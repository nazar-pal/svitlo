import { mockDatabase, mockUpdateChain, mockDeleteChain } from './mock-db'

jest.mock('@/lib/powersync/database', () => mockDatabase())

const mockIsGeneratorOrgAdmin = jest.fn()
const mockIsOrgAdmin = jest.fn()
let mockIdCounter = 0
jest.mock('../helpers', () => ({
  ...jest.requireActual('../helpers'),
  newId: () => `mock-id-${++mockIdCounter}`,
  isGeneratorOrgAdmin: (...args: unknown[]) => mockIsGeneratorOrgAdmin(...args),
  isOrgAdmin: (...args: unknown[]) => mockIsOrgAdmin(...args)
}))

const { db, powersync } = require('@/lib/powersync/database') as ReturnType<
  typeof mockDatabase
>

import {
  updateGenerator,
  createGeneratorWithMaintenance,
  deleteGenerator
} from '../generators'

beforeEach(() => {
  jest.resetAllMocks()
  mockIdCounter = 0
})

describe('updateGenerator', () => {
  it('succeeds with valid partial update and admin access', async () => {
    mockIsGeneratorOrgAdmin.mockResolvedValue(true)
    mockUpdateChain(db)

    const result = await updateGenerator('admin-1', 'gen-1', {
      title: 'New Title'
    })
    expect(result.ok).toBe(true)
  })

  it('fails when Zod validation fails', async () => {
    const result = await updateGenerator('admin-1', 'gen-1', {})
    expect(result.ok).toBe(false)
  })

  it('fails when not admin', async () => {
    mockIsGeneratorOrgAdmin.mockResolvedValue(false)

    const result = await updateGenerator('user-1', 'gen-1', {
      title: 'New Title'
    })
    expect(result.ok).toBe(false)
  })
})

describe('createGeneratorWithMaintenance', () => {
  const validGenerator = {
    organizationId: 'org-1',
    title: 'Honda EU2200i',
    model: 'EU2200i',
    maxConsecutiveRunHours: 8,
    requiredRestHours: 4
  }

  const validTemplate = {
    taskName: 'Oil change',
    triggerType: 'hours' as const,
    triggerHoursInterval: 100
  }

  it('succeeds with valid generator and maintenance templates', async () => {
    mockIsOrgAdmin.mockResolvedValue(true)

    const result = await createGeneratorWithMaintenance(
      'admin-1',
      validGenerator,
      [validTemplate]
    )
    expect(result.ok).toBe(true)
    expect(powersync.writeTransaction).toHaveBeenCalled()
  })

  it('succeeds with empty maintenance templates array', async () => {
    mockIsOrgAdmin.mockResolvedValue(true)

    const result = await createGeneratorWithMaintenance(
      'admin-1',
      validGenerator,
      []
    )
    expect(result.ok).toBe(true)
  })

  it('fails when generator Zod validation fails', async () => {
    const result = await createGeneratorWithMaintenance(
      'admin-1',
      { ...validGenerator, title: '' },
      []
    )
    expect(result.ok).toBe(false)
  })

  it('fails when not org admin', async () => {
    mockIsOrgAdmin.mockResolvedValue(false)

    const result = await createGeneratorWithMaintenance(
      'user-1',
      validGenerator,
      []
    )
    expect(result.ok).toBe(false)
  })

  it('fails when a maintenance template has invalid trigger fields', async () => {
    mockIsOrgAdmin.mockResolvedValue(true)

    const result = await createGeneratorWithMaintenance(
      'admin-1',
      validGenerator,
      [
        validTemplate,
        {
          taskName: 'Air filter',
          triggerType: 'hours' as const
          // missing triggerHoursInterval
        }
      ]
    )
    expect(result.ok).toBe(false)
  })
})

describe('deleteGenerator', () => {
  it('succeeds when admin', async () => {
    mockIsGeneratorOrgAdmin.mockResolvedValue(true)
    mockDeleteChain(db)

    const result = await deleteGenerator('admin-1', 'gen-1')
    expect(result.ok).toBe(true)
  })

  it('fails when not admin', async () => {
    mockIsGeneratorOrgAdmin.mockResolvedValue(false)

    const result = await deleteGenerator('user-1', 'gen-1')
    expect(result.ok).toBe(false)
  })
})
