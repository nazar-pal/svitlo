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
jest.mock('@/data/rpc-client', () => ({ rpcClient: {} }))
jest.mock('../sync-rejections', () => ({ addRejection: jest.fn() }))

const { ORPCError } = require('@orpc/client')

import { isAuthError, extractSqlState, categorizeError } from '../connector'

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
