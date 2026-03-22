import {
  mockDatabase,
  mockSelectChain,
  mockSelectChainSequence,
  mockInsertChain,
  mockUpdateChain,
  mockDeleteChain
} from './mock-db'

jest.mock('@/lib/powersync/database', () => mockDatabase())

const mockCanAccessGenerator = jest.fn()
jest.mock('../helpers', () => ({
  ...jest.requireActual('../helpers'),
  canAccessGenerator: (...args: unknown[]) => mockCanAccessGenerator(...args)
}))

const { db } = require('@/lib/powersync/database') as ReturnType<
  typeof mockDatabase
>

import {
  startSession,
  stopSession,
  deleteSession,
  updateSession,
  logManualSession
} from '../sessions'

beforeEach(() => {
  jest.resetAllMocks()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('startSession', () => {
  it('succeeds when generator exists, user has access, and no open session', async () => {
    // First select: generator exists
    // Second select: no open session
    mockSelectChainSequence(db, [[{ id: 'gen-1' }], []])
    mockCanAccessGenerator.mockResolvedValue(true)
    mockInsertChain(db)

    const result = await startSession('user-1', 'gen-1')
    expect(result.ok).toBe(true)
  })

  it('fails when generator not found', async () => {
    mockSelectChain(db, [])

    const result = await startSession('user-1', 'gen-1')
    expect(result.ok).toBe(false)
  })

  it('fails when user cannot access generator', async () => {
    mockSelectChain(db, [{ id: 'gen-1' }])
    mockCanAccessGenerator.mockResolvedValue(false)

    const result = await startSession('user-1', 'gen-1')
    expect(result.ok).toBe(false)
  })

  it('fails when an open session already exists', async () => {
    mockSelectChainSequence(db, [
      [{ id: 'gen-1' }],
      [{ id: 'session-1' }] // open session exists
    ])
    mockCanAccessGenerator.mockResolvedValue(true)

    const result = await startSession('user-1', 'gen-1')
    expect(result.ok).toBe(false)
  })
})

describe('stopSession', () => {
  it('succeeds when session exists, is open, and user has access', async () => {
    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: null
      }
    ])
    mockCanAccessGenerator.mockResolvedValue(true)
    mockUpdateChain(db)

    const result = await stopSession('user-1', 'session-1')
    expect(result.ok).toBe(true)
  })

  it('fails when session not found', async () => {
    mockSelectChain(db, [])

    const result = await stopSession('user-1', 'session-1')
    expect(result.ok).toBe(false)
  })

  it('fails when session is already stopped', async () => {
    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: '2026-01-15T12:00:00Z'
      }
    ])

    const result = await stopSession('user-1', 'session-1')
    expect(result.ok).toBe(false)
  })

  it('fails when user cannot access generator', async () => {
    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: null
      }
    ])
    mockCanAccessGenerator.mockResolvedValue(false)

    const result = await stopSession('user-1', 'session-1')
    expect(result.ok).toBe(false)
  })
})

describe('deleteSession', () => {
  it('succeeds for a closed session with access', async () => {
    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: '2026-01-15T12:00:00Z'
      }
    ])
    mockCanAccessGenerator.mockResolvedValue(true)
    mockDeleteChain(db)

    const result = await deleteSession('user-1', 'session-1')
    expect(result.ok).toBe(true)
  })

  it('fails when session not found', async () => {
    mockSelectChain(db, [])

    const result = await deleteSession('user-1', 'session-1')
    expect(result.ok).toBe(false)
  })

  it('fails when session is still active', async () => {
    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: null
      }
    ])

    const result = await deleteSession('user-1', 'session-1')
    expect(result.ok).toBe(false)
  })

  it('fails when user cannot access generator', async () => {
    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: '2026-01-15T12:00:00Z'
      }
    ])
    mockCanAccessGenerator.mockResolvedValue(false)

    const result = await deleteSession('user-1', 'session-1')
    expect(result.ok).toBe(false)
  })
})

describe('updateSession', () => {
  it('succeeds with valid times', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-16T00:00:00Z'))

    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: '2026-01-15T12:00:00Z'
      }
    ])
    mockCanAccessGenerator.mockResolvedValue(true)
    mockUpdateChain(db)

    const result = await updateSession('user-1', 'session-1', {
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(true)
  })

  it('fails when session not found', async () => {
    mockSelectChain(db, [])

    const result = await updateSession('user-1', 'session-1', {
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when session is still active', async () => {
    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: null
      }
    ])

    const result = await updateSession('user-1', 'session-1', {
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when startedAt >= stoppedAt', async () => {
    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: '2026-01-15T12:00:00Z'
      }
    ])
    mockCanAccessGenerator.mockResolvedValue(true)

    const result = await updateSession('user-1', 'session-1', {
      startedAt: '2026-01-15T14:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when stoppedAt is in the future', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15T10:00:00Z'))

    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: '2026-01-15T12:00:00Z'
      }
    ])
    mockCanAccessGenerator.mockResolvedValue(true)

    const result = await updateSession('user-1', 'session-1', {
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-16T00:00:00Z' // future
    })
    expect(result.ok).toBe(false)
  })

  it('fails when startedAt equals stoppedAt', async () => {
    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: '2026-01-15T12:00:00Z'
      }
    ])
    mockCanAccessGenerator.mockResolvedValue(true)

    const result = await updateSession('user-1', 'session-1', {
      startedAt: '2026-01-15T12:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when user cannot access generator', async () => {
    mockSelectChain(db, [
      {
        id: 'session-1',
        generatorId: 'gen-1',
        stoppedAt: '2026-01-15T12:00:00Z'
      }
    ])
    mockCanAccessGenerator.mockResolvedValue(false)

    const result = await updateSession('user-1', 'session-1', {
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(false)
  })
})

describe('logManualSession', () => {
  it('succeeds with valid inputs', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-16T00:00:00Z'))

    mockSelectChain(db, [{ id: 'gen-1' }])
    mockCanAccessGenerator.mockResolvedValue(true)
    mockInsertChain(db)

    const result = await logManualSession('user-1', {
      generatorId: 'gen-1',
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(true)
  })

  it('fails when generator not found', async () => {
    mockSelectChain(db, [])

    const result = await logManualSession('user-1', {
      generatorId: 'gen-1',
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when start > stop', async () => {
    mockSelectChain(db, [{ id: 'gen-1' }])
    mockCanAccessGenerator.mockResolvedValue(true)

    const result = await logManualSession('user-1', {
      generatorId: 'gen-1',
      startedAt: '2026-01-15T14:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when start equals stop (zero-duration session)', async () => {
    mockSelectChain(db, [{ id: 'gen-1' }])
    mockCanAccessGenerator.mockResolvedValue(true)

    const result = await logManualSession('user-1', {
      generatorId: 'gen-1',
      startedAt: '2026-01-15T12:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when stop is in the future', async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15T10:00:00Z'))

    mockSelectChain(db, [{ id: 'gen-1' }])
    mockCanAccessGenerator.mockResolvedValue(true)

    const result = await logManualSession('user-1', {
      generatorId: 'gen-1',
      startedAt: '2026-01-15T08:00:00Z',
      stoppedAt: '2026-01-16T00:00:00Z'
    })
    expect(result.ok).toBe(false)
  })

  it('fails when user cannot access generator', async () => {
    mockSelectChain(db, [{ id: 'gen-1' }])
    mockCanAccessGenerator.mockResolvedValue(false)

    const result = await logManualSession('user-1', {
      generatorId: 'gen-1',
      startedAt: '2026-01-15T10:00:00Z',
      stoppedAt: '2026-01-15T12:00:00Z'
    })
    expect(result.ok).toBe(false)
  })
})
