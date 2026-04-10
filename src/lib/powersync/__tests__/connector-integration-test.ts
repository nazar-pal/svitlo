/**
 * Integration tests for the PowerSync connector.
 *
 * These complement the unit tests in connector-test.ts by exercising the
 * full oRPC serialization round-trip via a fetch interceptor. Exhaustive
 * scenario coverage (caching, expiry, rejection variants, error
 * classification, etc.) lives in the unit test — this file only covers
 * what the unit test cannot:
 *
 *   1. The oRPC wire format ({ json: ... } envelope) is correct
 *   2. Multi-op CRUD ordering through the transport layer
 *   3. Fetch round-trip behaviour for structured rejections and for
 *      unrecognized HTTP errors (the latter guards the bug fix: they
 *      must re-throw, not drop)
 *
 * Note: the test-rpc-client is a minimal reimplementation of the oRPC
 * wire format, not the real @orpc/client (which is ESM-only and can't
 * load in Jest 29's CJS runtime).
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
  UpdateType: { DELETE: 'DELETE', PATCH: 'PATCH', PUT: 'PUT' }
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

import { createPowerSyncConnector } from '../connector'

afterEach(() => {
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

function buildConnector() {
  return createPowerSyncConnector({ onAuthExpired: () => {} })
}

// ── fetchCredentials ─────────────────────────────────────────────────────────

describe('fetchCredentials (integration)', () => {
  it('round-trips credentials through the fetch interceptor', async () => {
    const { mockFetch } = createFetchInterceptor({
      'powersync/token': { response: defaultTokenResponse() }
    })
    mockTestFetch = mockFetch

    const connector = buildConnector()
    const creds = await connector.fetchCredentials()

    expect(creds).not.toBeNull()
    expect(creds?.token).toBe('test-token')
    expect(creds?.endpoint).toBe('https://ps.test.local')
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

    const connector = buildConnector()
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

    const connector = buildConnector()
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

  it('handles structured rejection response (200 with ok:false)', async () => {
    // The server returns constraint errors as a 200 with
    // `{ok: false, rejection: {...}}` — this is the real production path.
    const { mockFetch } = createFetchInterceptor({
      'powersync/applyWrite': {
        response: {
          ok: false,
          rejection: {
            code: '23505',
            table: 'generator',
            message: 'duplicate key value violates unique constraint'
          }
        }
      }
    })
    mockTestFetch = mockFetch

    const connector = buildConnector()
    const tx = makeMockTransaction([
      { op: 'PUT', table: 'generator', id: 'g1', opData: { title: 'Honda' } }
    ])
    const db = makeMockDatabase(tx)

    await connector.uploadData(db as never)

    expect(mockAddRejection).toHaveBeenCalledWith(
      expect.objectContaining({
        table: 'generator',
        op: 'insert',
        id: 'g1',
        reason: 'duplicate key value violates unique constraint'
      })
    )
    expect(tx.complete).toHaveBeenCalledTimes(1)
  })

  it('re-throws on unrecognized 400 server error (regression guard)', async () => {
    // On `main`, an unrecognized 400 would be classified as
    // `{category: 'unknown', isRecoverable: false}` and the upload loop
    // would silently complete the transaction and drop the op. The new
    // behaviour is to re-throw so PowerSync retries with backoff.
    const { mockFetch } = createFetchInterceptor({
      'powersync/applyWrite': {
        status: 400,
        errorBody: {
          defined: true,
          code: 'INTERNAL_ERROR',
          status: 400,
          message: 'something completely unexpected went wrong'
        }
      }
    })
    mockTestFetch = mockFetch

    const connector = buildConnector()
    const tx = makeMockTransaction([
      { op: 'PUT', table: 'generator', id: 'g1', opData: { title: 'Honda' } }
    ])
    const db = makeMockDatabase(tx)

    await expect(connector.uploadData(db as never)).rejects.toThrow(
      'something completely unexpected went wrong'
    )

    expect(tx.complete).not.toHaveBeenCalled()
    expect(mockAddRejection).not.toHaveBeenCalled()
  })
})
