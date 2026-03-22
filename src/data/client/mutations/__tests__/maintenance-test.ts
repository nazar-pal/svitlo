import {
  mockDatabase,
  mockSelectChain,
  mockSelectChainSequence,
  mockInsertChain,
  mockUpdateChain,
  mockDeleteChain
} from './mock-db'

jest.mock('@/lib/powersync/database', () => mockDatabase())

const mockIsGeneratorOrgAdmin = jest.fn()
const mockCanAccessGenerator = jest.fn()
jest.mock('../helpers', () => ({
  ...jest.requireActual('../helpers'),
  isGeneratorOrgAdmin: (...args: unknown[]) => mockIsGeneratorOrgAdmin(...args),
  canAccessGenerator: (...args: unknown[]) => mockCanAccessGenerator(...args)
}))

const { db } = require('@/lib/powersync/database') as ReturnType<
  typeof mockDatabase
>

import {
  createMaintenanceTemplate,
  createManyMaintenanceTemplates,
  updateMaintenanceTemplate,
  deleteMaintenanceTemplate,
  recordMaintenance,
  deleteMaintenanceRecord,
  updateMaintenanceRecord
} from '../maintenance'

beforeEach(() => {
  jest.resetAllMocks()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('createMaintenanceTemplate', () => {
  it('succeeds with valid input and admin access', async () => {
    mockIsGeneratorOrgAdmin.mockResolvedValue(true)
    mockInsertChain(db)

    const result = await createMaintenanceTemplate('user-1', {
      generatorId: 'gen-1',
      taskName: 'Oil change',
      triggerType: 'hours',
      triggerHoursInterval: 100
    })
    expect(result.ok).toBe(true)
  })

  it('fails when Zod validation fails', async () => {
    const result = await createMaintenanceTemplate('user-1', {
      generatorId: 'gen-1',
      taskName: '',
      triggerType: 'hours',
      triggerHoursInterval: 100
    })
    expect(result.ok).toBe(false)
  })

  it('fails when not admin', async () => {
    mockIsGeneratorOrgAdmin.mockResolvedValue(false)

    const result = await createMaintenanceTemplate('user-1', {
      generatorId: 'gen-1',
      taskName: 'Oil change',
      triggerType: 'hours',
      triggerHoursInterval: 100
    })
    expect(result.ok).toBe(false)
  })
})

describe('createManyMaintenanceTemplates', () => {
  const validTemplate = {
    generatorId: 'gen-1',
    taskName: 'Oil change',
    triggerType: 'hours' as const,
    triggerHoursInterval: 100
  }

  it('fails when inputs array is empty', async () => {
    const result = await createManyMaintenanceTemplates('user-1', [])
    expect(result.ok).toBe(false)
  })

  it('fails when templates have different generatorIds', async () => {
    const result = await createManyMaintenanceTemplates('user-1', [
      validTemplate,
      { ...validTemplate, generatorId: 'gen-2' }
    ])
    expect(result.ok).toBe(false)
  })

  it('fails when individual template validation fails', async () => {
    const result = await createManyMaintenanceTemplates('user-1', [
      validTemplate,
      { ...validTemplate, taskName: '' }
    ])
    expect(result.ok).toBe(false)
  })

  it('fails when not admin', async () => {
    mockIsGeneratorOrgAdmin.mockResolvedValue(false)

    const result = await createManyMaintenanceTemplates('user-1', [
      validTemplate
    ])
    expect(result.ok).toBe(false)
  })
})

describe('updateMaintenanceTemplate', () => {
  it('succeeds with valid partial update', async () => {
    mockSelectChain(db, [{ generatorId: 'gen-1' }])
    mockIsGeneratorOrgAdmin.mockResolvedValue(true)
    mockUpdateChain(db)

    const result = await updateMaintenanceTemplate('user-1', 'tmpl-1', {
      taskName: 'New name'
    })
    expect(result.ok).toBe(true)
  })

  it('fails when template not found', async () => {
    mockSelectChain(db, [])

    const result = await updateMaintenanceTemplate('user-1', 'tmpl-1', {
      taskName: 'New name'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when not admin', async () => {
    mockSelectChain(db, [{ generatorId: 'gen-1' }])
    mockIsGeneratorOrgAdmin.mockResolvedValue(false)

    const result = await updateMaintenanceTemplate('user-1', 'tmpl-1', {
      taskName: 'New name'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when Zod validation fails', async () => {
    const result = await updateMaintenanceTemplate('user-1', 'tmpl-1', {
      taskName: ''
    })
    expect(result.ok).toBe(false)
  })

  it('fails when update payload is empty', async () => {
    const result = await updateMaintenanceTemplate('user-1', 'tmpl-1', {})
    expect(result.ok).toBe(false)
  })

  it('fails when changing to calendar without triggerCalendarDays', async () => {
    mockSelectChainSequence(db, [
      [{ generatorId: 'gen-1' }],
      [
        {
          generatorId: 'gen-1',
          triggerType: 'hours',
          triggerHoursInterval: 100,
          triggerCalendarDays: null,
          isOneTime: 0
        }
      ]
    ])
    mockIsGeneratorOrgAdmin.mockResolvedValue(true)

    const result = await updateMaintenanceTemplate('user-1', 'tmpl-1', {
      triggerType: 'calendar'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when changing triggerType without required companion fields', async () => {
    // First select: get generatorId for auth
    // Second select: get existing template (missing triggerHoursInterval)
    mockSelectChainSequence(db, [
      [{ generatorId: 'gen-1' }],
      [
        {
          generatorId: 'gen-1',
          triggerType: 'calendar',
          triggerHoursInterval: null,
          triggerCalendarDays: 90,
          isOneTime: 0
        }
      ]
    ])
    mockIsGeneratorOrgAdmin.mockResolvedValue(true)

    // Changing to 'hours' but existing template has no triggerHoursInterval
    const result = await updateMaintenanceTemplate('user-1', 'tmpl-1', {
      triggerType: 'hours'
    })
    expect(result.ok).toBe(false)
  })
})

describe('deleteMaintenanceTemplate', () => {
  it('succeeds when admin', async () => {
    mockSelectChain(db, [{ generatorId: 'gen-1' }])
    mockIsGeneratorOrgAdmin.mockResolvedValue(true)
    mockDeleteChain(db)

    const result = await deleteMaintenanceTemplate('user-1', 'tmpl-1')
    expect(result.ok).toBe(true)
  })

  it('fails when template not found', async () => {
    mockSelectChain(db, [])

    const result = await deleteMaintenanceTemplate('user-1', 'tmpl-1')
    expect(result.ok).toBe(false)
  })

  it('fails when not admin', async () => {
    mockSelectChain(db, [{ generatorId: 'gen-1' }])
    mockIsGeneratorOrgAdmin.mockResolvedValue(false)

    const result = await deleteMaintenanceTemplate('user-1', 'tmpl-1')
    expect(result.ok).toBe(false)
  })
})

describe('recordMaintenance', () => {
  it('succeeds when user has access and template belongs to generator', async () => {
    mockCanAccessGenerator.mockResolvedValue(true)
    mockSelectChain(db, [{ generatorId: 'gen-1' }])
    mockInsertChain(db)

    const result = await recordMaintenance('user-1', {
      templateId: 'tmpl-1',
      generatorId: 'gen-1'
    })
    expect(result.ok).toBe(true)
  })

  it('fails when user cannot access generator', async () => {
    mockCanAccessGenerator.mockResolvedValue(false)

    const result = await recordMaintenance('user-1', {
      templateId: 'tmpl-1',
      generatorId: 'gen-1'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when template not found', async () => {
    mockCanAccessGenerator.mockResolvedValue(true)
    mockSelectChain(db, [])

    const result = await recordMaintenance('user-1', {
      templateId: 'tmpl-1',
      generatorId: 'gen-1'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when template does not belong to generator', async () => {
    mockCanAccessGenerator.mockResolvedValue(true)
    mockSelectChain(db, [{ generatorId: 'other-gen' }])

    const result = await recordMaintenance('user-1', {
      templateId: 'tmpl-1',
      generatorId: 'gen-1'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when Zod validation fails', async () => {
    const result = await recordMaintenance('user-1', {
      templateId: 'tmpl-1',
      generatorId: 'gen-1',
      performedAt: 'not-a-date'
    })
    expect(result.ok).toBe(false)
  })
})

describe('deleteMaintenanceRecord', () => {
  it('succeeds with access', async () => {
    mockSelectChain(db, [{ id: 'rec-1', generatorId: 'gen-1' }])
    mockCanAccessGenerator.mockResolvedValue(true)
    mockDeleteChain(db)

    const result = await deleteMaintenanceRecord('user-1', 'rec-1')
    expect(result.ok).toBe(true)
  })

  it('fails when record not found', async () => {
    mockSelectChain(db, [])

    const result = await deleteMaintenanceRecord('user-1', 'rec-1')
    expect(result.ok).toBe(false)
  })

  it('fails when user cannot access generator', async () => {
    mockSelectChain(db, [{ id: 'rec-1', generatorId: 'gen-1' }])
    mockCanAccessGenerator.mockResolvedValue(false)

    const result = await deleteMaintenanceRecord('user-1', 'rec-1')
    expect(result.ok).toBe(false)
  })
})

describe('updateMaintenanceRecord', () => {
  it('succeeds with valid past time', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-16T00:00:00Z'))

    mockSelectChain(db, [{ id: 'rec-1', generatorId: 'gen-1' }])
    mockCanAccessGenerator.mockResolvedValue(true)
    mockUpdateChain(db)

    const result = await updateMaintenanceRecord('user-1', 'rec-1', {
      performedAt: '2026-01-15T12:00:00Z',
      notes: 'Updated'
    })
    expect(result.ok).toBe(true)
  })

  it('fails when record not found', async () => {
    mockSelectChain(db, [])

    const result = await updateMaintenanceRecord('user-1', 'rec-1', {
      performedAt: '2026-01-15T12:00:00Z',
      notes: null
    })
    expect(result.ok).toBe(false)
  })

  it('fails when user cannot access generator', async () => {
    mockSelectChain(db, [{ id: 'rec-1', generatorId: 'gen-1' }])
    mockCanAccessGenerator.mockResolvedValue(false)

    const result = await updateMaintenanceRecord('user-1', 'rec-1', {
      performedAt: '2026-01-15T12:00:00Z',
      notes: null
    })
    expect(result.ok).toBe(false)
  })

  it('fails when performedAt is in the future', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15T10:00:00Z'))

    mockSelectChain(db, [{ id: 'rec-1', generatorId: 'gen-1' }])
    mockCanAccessGenerator.mockResolvedValue(true)

    const result = await updateMaintenanceRecord('user-1', 'rec-1', {
      performedAt: '2026-01-16T00:00:00Z',
      notes: null
    })
    expect(result.ok).toBe(false)
  })
})
