/**
 * Integration tests for the Connector class.
 *
 * These complement the unit tests in connector-test.ts by exercising the full
 * oRPC serialization round-trip via a fetch interceptor. Exhaustive scenario
 * coverage (caching, expiry, rejection variants, error categorization, etc.)
 * lives in the unit test — this file only covers what the unit test cannot:
 *
 * 1. The oRPC wire format ({ json: ... } envelope) is correct
 * 2. Multi-op CRUD ordering through the transport layer
 * 3. A basic fetch round-trip proves the interceptor wiring works
 *
 * Note: the test-rpc-client is a minimal reimplementation of the oRPC wire
 * format, not the real @orpc/client (which is ESM-only). Auth errors here
 * hit the string-matching branch of isAuthError, not the ORPCError instanceof
 * branch — the unit test covers the latter.
 */

import {
  createFetchInterceptor,
  defaultTokenResponse
} from './fetch-interceptors/handlers'

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

let mockTestFetch: typeof fetch
jest.mock('@/data/client/rpc-client', () => {
  const {
    createTestRpcClient
  } = require('./fetch-interceptors/test-rpc-client')
  return {
    get rpcClient() {
      return createTestRpcClient(mockTestFetch)
    }
  }
})

const mockAddRejection = jest.fn()
jest.mock('../sync-rejections', () => ({
  addRejection: (...args: unknown[]) => mockAddRejection(...args)
}))

import { Connector, clearCredentialCache } from '../connector'

afterEach(() => {
  clearCredentialCache()
  jest.resetAllMocks()
})

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

// ── fetchCredentials ─────────────────────────────────────────────────────────

describe('fetchCredentials (integration)', () => {
  it('round-trips credentials through the fetch interceptor', async () => {
    const { mockFetch } = createFetchInterceptor({
      'powersync/token': { response: defaultTokenResponse() }
    })
    mockTestFetch = mockFetch

    const connector = new Connector()
    const creds = await connector.fetchCredentials()

    expect(creds.token).toBe('test-token')
    expect(creds.endpoint).toBe('https://ps.test.local')
  })
})

// ── uploadData ───────────────────────────────────────────────────────────────

describe('uploadData (integration)', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
  })
  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('sends correct oRPC wire format in request body', async () => {
    const { mockFetch, captured } = createFetchInterceptor({
      'powersync/applyWrite': { response: { ok: true } }
    })
    mockTestFetch = mockFetch

    const connector = new Connector()
    const tx = makeMockTransaction([
      { op: 'PUT', table: 'generator', id: 'g1', opData: { title: 'Honda' } }
    ])
    const db = makeMockDatabase(tx)

    await connector.uploadData(db as never)

    expect(captured).toHaveLength(1)
    expect(captured[0].url).toBe(
      'http://test.local/api/rpc/powersync/applyWrite'
    )

    // oRPC wraps input in { json: { ... } } envelope
    const body = captured[0].body as { json: unknown }
    expect(body).toHaveProperty('json')
    expect(body.json).toMatchObject({
      table: 'generator',
      op: 'insert',
      id: 'g1',
      data: { title: 'Honda' }
    })
  })

  it('processes multiple CRUD ops in order', async () => {
    const { mockFetch, captured } = createFetchInterceptor({
      'powersync/applyWrite': { response: { ok: true } }
    })
    mockTestFetch = mockFetch

    const connector = new Connector()
    const tx = makeMockTransaction([
      { op: 'PUT', table: 'generator', id: 'g1', opData: { title: 'Honda' } },
      {
        op: 'PATCH',
        table: 'generator',
        id: 'g1',
        opData: { title: 'Yamaha' }
      },
      { op: 'DELETE', table: 'session', id: 's1' }
    ])
    const db = makeMockDatabase(tx)

    await connector.uploadData(db as never)

    expect(captured).toHaveLength(3)
    expect((captured[0].body as { json: { op: string } }).json.op).toBe(
      'insert'
    )
    expect((captured[1].body as { json: { op: string } }).json.op).toBe(
      'update'
    )
    expect((captured[2].body as { json: { op: string } }).json.op).toBe(
      'delete'
    )
    expect(tx.complete).toHaveBeenCalledTimes(1)
  })

  it('adds rejection and completes transaction on non-recoverable server error', async () => {
    const { mockFetch } = createFetchInterceptor({
      'powersync/applyWrite': {
        status: 400,
        errorBody: {
          defined: true,
          code: 'CONSTRAINT_VIOLATION',
          status: 400,
          message:
            'duplicate key value violates unique constraint SQLSTATE: 23505'
        }
      }
    })
    mockTestFetch = mockFetch

    const connector = new Connector()
    const tx = makeMockTransaction([
      { op: 'PUT', table: 'generator', id: 'g1', opData: { title: 'Honda' } }
    ])
    const db = makeMockDatabase(tx)

    await connector.uploadData(db as never)

    expect(mockAddRejection).toHaveBeenCalledWith(
      expect.objectContaining({ table: 'generator', op: 'insert', id: 'g1' })
    )
    expect(tx.complete).toHaveBeenCalledTimes(1)
  })
})
