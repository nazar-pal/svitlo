jest.mock('@orpc/client', () => {
  class ORPCError extends Error {
    code: string
    constructor(message: string, opts: { code: string }) {
      super(message)
      this.code = opts.code
    }
  }
  return { ORPCError }
})
jest.mock('@powersync/react-native', () => ({
  UpdateType: { DELETE: 'DELETE', PATCH: 'PATCH' }
}))
const mockToken = jest.fn()
const mockApplyWrite = jest.fn()
jest.mock('@/data/client/rpc-client', () => ({
  rpcClient: {
    powersync: {
      token: (...args: unknown[]) => mockToken(...args),
      applyWrite: (...args: unknown[]) => mockApplyWrite(...args)
    }
  }
}))
const mockAddRejection = jest.fn()
jest.mock('../sync-rejections', () => ({
  addRejection: (...args: unknown[]) => mockAddRejection(...args)
}))

const { ORPCError } = require('@orpc/client')

import {
  isAuthError,
  extractSqlState,
  categorizeError,
  Connector,
  clearCredentialCache
} from '../connector'

describe('isAuthError', () => {
  it('returns true for ORPCError with UNAUTHORIZED code', () => {
    const error = new ORPCError('Unauthorized', { code: 'UNAUTHORIZED' })
    expect(isAuthError(error)).toBe(true)
  })

  it('returns true for Error with 401 in message', () => {
    expect(isAuthError(new Error('Request failed with status 401'))).toBe(true)
  })

  it('returns true for Error with unauthorized in message', () => {
    expect(isAuthError(new Error('unauthorized access'))).toBe(true)
  })

  it('returns false for regular Error', () => {
    expect(isAuthError(new Error('Something broke'))).toBe(false)
  })

  it('returns false for non-error values', () => {
    expect(isAuthError('just a string')).toBe(false)
    expect(isAuthError(null)).toBe(false)
  })

  it('returns false for ORPCError with non-UNAUTHORIZED code', () => {
    const error = new ORPCError('Not found', { code: 'NOT_FOUND' })
    expect(isAuthError(error)).toBe(false)
  })
})

describe('extractSqlState', () => {
  it('extracts from .code property', () => {
    const error = { code: '23505', message: 'unique violation' }
    expect(extractSqlState(error)).toBe('23505')
  })

  it('extracts from .sqlState property', () => {
    const error = { sqlState: '23503', message: 'fk violation' }
    expect(extractSqlState(error)).toBe('23503')
  })

  it('extracts from .cause.code property', () => {
    const error = { cause: { code: '23514' }, message: 'check violation' }
    expect(extractSqlState(error)).toBe('23514')
  })

  it('extracts from message string', () => {
    const error = new Error('SQLSTATE: 23505 unique_violation')
    expect(extractSqlState(error)).toBe('23505')
  })

  it('extracts case-insensitive code from message', () => {
    const error = new Error('code: 08001 connection refused')
    expect(extractSqlState(error)).toBe('08001')
  })

  it('returns null for errors without SQL state', () => {
    expect(extractSqlState(new Error('network timeout'))).toBeNull()
  })

  it('returns null for non-5-digit .code', () => {
    const error = { code: 'ECONNREFUSED', message: 'refused' }
    expect(extractSqlState(error)).toBeNull()
  })
})

describe('categorizeError', () => {
  it('classifies auth errors as recoverable', () => {
    const error = new ORPCError('Unauthorized', { code: 'UNAUTHORIZED' })
    const result = categorizeError(error)
    expect(result.category).toBe('auth_expired')
    expect(result.isRecoverable).toBe(true)
  })

  it('classifies constraint violations as non-recoverable', () => {
    const error = { code: '23505', message: 'unique_violation' }
    const result = categorizeError(error)
    expect(result.category).toBe('constraint_violation')
    expect(result.isRecoverable).toBe(false)
  })

  it('classifies all class 23 SQLSTATE as constraint violations', () => {
    for (const code of ['23000', '23502', '23503', '23505', '23514']) {
      const result = categorizeError({ code, message: 'constraint' })
      expect(result.category).toBe('constraint_violation')
      expect(result.isRecoverable).toBe(false)
    }
  })

  it('classifies class 08 SQLSTATE (connection) as recoverable', () => {
    const error = { code: '08001', message: 'connection refused' }
    const result = categorizeError(error)
    expect(result.category).toBe('network')
    expect(result.isRecoverable).toBe(true)
  })

  it('classifies class 28 SQLSTATE (auth forbidden) as non-recoverable', () => {
    const error = { code: '28000', message: 'invalid authorization' }
    const result = categorizeError(error)
    expect(result.category).toBe('auth_forbidden')
    expect(result.isRecoverable).toBe(false)
  })

  it('classifies network keyword errors as recoverable', () => {
    const keywords = [
      'network error',
      'timeout',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ECONNRESET'
    ]
    for (const msg of keywords) {
      const result = categorizeError(new Error(msg))
      expect(result.category).toBe('network')
      expect(result.isRecoverable).toBe(true)
    }
  })

  it('classifies 403/forbidden as non-recoverable auth_forbidden', () => {
    const result403 = categorizeError(new Error('403 Forbidden'))
    expect(result403.category).toBe('auth_forbidden')
    expect(result403.isRecoverable).toBe(false)

    const resultForbidden = categorizeError(new Error('access forbidden'))
    expect(resultForbidden.category).toBe('auth_forbidden')
    expect(resultForbidden.isRecoverable).toBe(false)
  })

  it('classifies unknown errors as non-recoverable', () => {
    const result = categorizeError(new Error('something unexpected'))
    expect(result.category).toBe('unknown')
    expect(result.isRecoverable).toBe(false)
  })
})

// ── Connector class ───────────────────────────────────────────────────────────

function makeMockTransaction(
  crud: {
    op: string
    table: string
    id: string
    opData?: Record<string, unknown>
  }[]
) {
  return { crud, complete: jest.fn() }
}

function makeMockDatabase(
  transaction: ReturnType<typeof makeMockTransaction> | null = null
) {
  return { getNextCrudTransaction: jest.fn().mockResolvedValue(transaction) }
}

describe('Connector.fetchCredentials', () => {
  beforeEach(() => {
    clearCredentialCache()
    jest.resetAllMocks()
  })

  it('returns credentials from RPC on first call', async () => {
    const connector = new Connector()
    mockToken.mockResolvedValue({
      endpoint: 'https://ps.example.com',
      token: 'tok_123',
      expiresAt: new Date(Date.now() + 600_000).toISOString()
    })

    const creds = await connector.fetchCredentials()
    expect(creds.endpoint).toBe('https://ps.example.com')
    expect(creds.token).toBe('tok_123')
    expect(mockToken).toHaveBeenCalledTimes(1)
  })

  it('returns cached credentials when not expired', async () => {
    const connector = new Connector()
    mockToken.mockResolvedValue({
      endpoint: 'https://ps.example.com',
      token: 'tok_123',
      expiresAt: new Date(Date.now() + 600_000).toISOString()
    })

    await connector.fetchCredentials()
    const creds = await connector.fetchCredentials()
    expect(creds.token).toBe('tok_123')
    expect(mockToken).toHaveBeenCalledTimes(1)
  })

  it('refetches when cached credentials are within 30s of expiry', async () => {
    const connector = new Connector()
    // First call: expires in 10s (within 30s buffer)
    mockToken.mockResolvedValueOnce({
      endpoint: 'https://ps.example.com',
      token: 'tok_old',
      expiresAt: new Date(Date.now() + 10_000).toISOString()
    })
    await connector.fetchCredentials()

    // Second call should refetch because expiry is within 30s buffer
    mockToken.mockResolvedValueOnce({
      endpoint: 'https://ps.example.com',
      token: 'tok_new',
      expiresAt: new Date(Date.now() + 600_000).toISOString()
    })
    const creds = await connector.fetchCredentials()
    expect(creds.token).toBe('tok_new')
    expect(mockToken).toHaveBeenCalledTimes(2)
  })

  it('clears cache and calls onAuthFailure on auth error', async () => {
    const onAuthFailure = jest.fn()
    const connector = new Connector(onAuthFailure)
    mockToken.mockRejectedValue(
      new ORPCError('Unauthorized', { code: 'UNAUTHORIZED' })
    )

    await expect(connector.fetchCredentials()).rejects.toThrow('Unauthorized')
    expect(onAuthFailure).toHaveBeenCalledTimes(1)

    // Cache was cleared — next call should attempt RPC again
    mockToken.mockResolvedValue({
      endpoint: 'https://ps.example.com',
      token: 'tok_fresh',
      expiresAt: new Date(Date.now() + 600_000).toISOString()
    })
    const creds = await connector.fetchCredentials()
    expect(creds.token).toBe('tok_fresh')
  })

  it('throws non-auth errors without calling onAuthFailure', async () => {
    const onAuthFailure = jest.fn()
    const connector = new Connector(onAuthFailure)
    mockToken.mockRejectedValue(new Error('server down'))

    await expect(connector.fetchCredentials()).rejects.toThrow('server down')
    expect(onAuthFailure).not.toHaveBeenCalled()
  })
})

describe('Connector.uploadData', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    clearCredentialCache()
    jest.resetAllMocks()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('returns early when no transaction', async () => {
    const connector = new Connector()
    const db = makeMockDatabase(null)
    await connector.uploadData(db as never)
    expect(mockApplyWrite).not.toHaveBeenCalled()
  })

  it('processes CRUD operations and completes transaction', async () => {
    const connector = new Connector()
    const tx = makeMockTransaction([
      { op: 'DELETE', table: 'session', id: 'id1' },
      { op: 'PATCH', table: 'generator', id: 'id2', opData: { name: 'G1' } },
      { op: 'PUT', table: 'organization', id: 'id3', opData: { name: 'Org' } }
    ])
    const db = makeMockDatabase(tx)
    mockApplyWrite.mockResolvedValue({ ok: true })

    await connector.uploadData(db as never)

    expect(mockApplyWrite).toHaveBeenCalledTimes(3)
    expect(mockApplyWrite).toHaveBeenCalledWith({
      table: 'session',
      op: 'delete',
      id: 'id1',
      data: undefined
    })
    expect(mockApplyWrite).toHaveBeenCalledWith({
      table: 'generator',
      op: 'update',
      id: 'id2',
      data: { name: 'G1' }
    })
    expect(mockApplyWrite).toHaveBeenCalledWith({
      table: 'organization',
      op: 'insert',
      id: 'id3',
      data: { name: 'Org' }
    })
    expect(tx.complete).toHaveBeenCalledTimes(1)
  })

  it('handles result.rejection by calling addRejection', async () => {
    const connector = new Connector()
    const tx = makeMockTransaction([
      { op: 'PUT', table: 'session', id: 'id1', opData: {} }
    ])
    const db = makeMockDatabase(tx)
    mockApplyWrite.mockResolvedValue({
      ok: false,
      rejection: { table: 'session', message: 'FK violation' }
    })

    await connector.uploadData(db as never)

    expect(mockAddRejection).toHaveBeenCalledWith({
      table: 'session',
      op: 'insert',
      id: 'id1',
      reason: 'FK violation'
    })
    expect(tx.complete).toHaveBeenCalledTimes(1)
  })

  it('handles result.error by calling addRejection', async () => {
    const connector = new Connector()
    const tx = makeMockTransaction([
      { op: 'PATCH', table: 'generator', id: 'id1', opData: {} }
    ])
    const db = makeMockDatabase(tx)
    mockApplyWrite.mockResolvedValue({
      ok: false,
      error: 'something went wrong'
    })

    await connector.uploadData(db as never)

    expect(mockAddRejection).toHaveBeenCalledWith({
      table: 'generator',
      op: 'update',
      id: 'id1',
      reason: 'something went wrong'
    })
    expect(tx.complete).toHaveBeenCalledTimes(1)
  })

  it('re-throws recoverable network errors without completing transaction', async () => {
    const connector = new Connector()
    const tx = makeMockTransaction([
      { op: 'PUT', table: 'session', id: 'id1', opData: {} }
    ])
    const db = makeMockDatabase(tx)
    mockApplyWrite.mockRejectedValue(new Error('network timeout'))

    await expect(connector.uploadData(db as never)).rejects.toThrow(
      'network timeout'
    )
    expect(tx.complete).not.toHaveBeenCalled()
  })

  it('completes transaction and adds rejection for non-recoverable errors', async () => {
    const connector = new Connector()
    const tx = makeMockTransaction([
      { op: 'PUT', table: 'session', id: 'id1', opData: {} }
    ])
    const db = makeMockDatabase(tx)
    const error = Object.assign(new Error('unique_violation'), {
      code: '23505'
    })
    mockApplyWrite.mockRejectedValue(error)

    await connector.uploadData(db as never)

    expect(mockAddRejection).toHaveBeenCalledWith({
      table: 'session',
      op: 'insert',
      id: 'id1',
      reason: 'unique_violation'
    })
    expect(tx.complete).toHaveBeenCalledTimes(1)
  })

  it('clears cache and calls onAuthFailure on auth error during upload', async () => {
    const onAuthFailure = jest.fn()
    const connector = new Connector(onAuthFailure)
    const tx = makeMockTransaction([
      { op: 'PUT', table: 'session', id: 'id1', opData: {} }
    ])
    const db = makeMockDatabase(tx)
    mockApplyWrite.mockRejectedValue(
      new ORPCError('Unauthorized', { code: 'UNAUTHORIZED' })
    )

    // Auth errors are categorized as recoverable, so they re-throw
    await expect(connector.uploadData(db as never)).rejects.toThrow(
      'Unauthorized'
    )
    expect(onAuthFailure).toHaveBeenCalledTimes(1)
    expect(tx.complete).not.toHaveBeenCalled()
  })
})

describe('clearCredentialCache', () => {
  it('forces next fetchCredentials to refetch', async () => {
    const connector = new Connector()
    mockToken.mockResolvedValue({
      endpoint: 'https://ps.example.com',
      token: 'tok_1',
      expiresAt: new Date(Date.now() + 600_000).toISOString()
    })

    await connector.fetchCredentials()
    expect(mockToken).toHaveBeenCalledTimes(1)

    clearCredentialCache()

    mockToken.mockResolvedValue({
      endpoint: 'https://ps.example.com',
      token: 'tok_2',
      expiresAt: new Date(Date.now() + 600_000).toISOString()
    })
    const creds = await connector.fetchCredentials()
    expect(creds.token).toBe('tok_2')
    expect(mockToken).toHaveBeenCalledTimes(2)
  })
})
