/**
 * Boundary tests for the PowerSync connector.
 *
 * Every test drives `createPowerSyncConnector` through its public
 * interface (`fetchCredentials`, `uploadData`) and asserts on observable
 * outcomes: calls into the transport fake, entries recorded by the
 * injected outbox, `tx.complete()` calls, and thrown errors. Nothing
 * here reaches into private module state or tests internal helpers
 * directly — the classifier, credential cache, and CRUD mapping are all
 * verified via the behaviours they produce at the boundary.
 *
 * The `jest.mock()` calls below are module-loader shims, not test
 * doubles. `@powersync/react-native`, `@orpc/client`, and the chain
 * reached via `@/data/client/rpc-client` (which pulls `@orpc/client/fetch`)
 * are all ESM-only and can't be `require()`d in Jest 29's CJS runtime.
 */

jest.mock('@powersync/react-native', () => ({
  UpdateType: { PUT: 'PUT', PATCH: 'PATCH', DELETE: 'DELETE' }
}))

jest.mock('@orpc/client', () => {
  // Mirrors the real `@orpc/client` constructor signature:
  // `new ORPCError(code, { message?, status?, ... })`.
  class ORPCError extends Error {
    readonly code: string
    constructor(code: string, opts?: { message?: string }) {
      super(opts?.message ?? code)
      this.code = code
    }
  }
  return { ORPCError }
})

jest.mock('@/data/client/rpc-client', () => ({ rpcClient: {} }))

import { ORPCError } from '@orpc/client'
import {
  UpdateType,
  type AbstractPowerSyncDatabase,
  type CrudEntry,
  type PowerSyncCredentials
} from '@powersync/react-native'

import {
  createPowerSyncConnector,
  type ApplyWriteResult,
  type CrudWrite,
  type SyncTransport
} from '../connector'
import { createSyncOutbox, type SyncOutbox } from '../sync-outbox'

// ── Fakes ───────────────────────────────────────────────────────────────────

function defaultCredentials(): PowerSyncCredentials {
  return {
    endpoint: 'https://ps.test.local',
    token: 'tok_test',
    expiresAt: new Date(Date.now() + 600_000)
  }
}

function fakeTransport(
  opts: {
    token?: () => Promise<PowerSyncCredentials>
    applyWrite?: (write: CrudWrite) => Promise<ApplyWriteResult>
  } = {}
): SyncTransport & { calls: { token: number; writes: CrudWrite[] } } {
  const calls = { token: 0, writes: [] as CrudWrite[] }
  return {
    calls,
    async fetchToken() {
      calls.token++
      return opts.token ? opts.token() : defaultCredentials()
    },
    async applyWrite(write) {
      calls.writes.push(write)
      return opts.applyWrite ? opts.applyWrite(write) : { ok: true }
    }
  }
}

function fakeClock(initial: number) {
  let current = initial
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms
    }
  }
}

interface FakeCrudOp {
  op: CrudEntry['op']
  table: string
  id: string
  opData?: Record<string, unknown>
}

function fakeCrudTransaction(ops: FakeCrudOp[]) {
  return {
    crud: ops as unknown as CrudEntry[],
    complete: jest.fn().mockResolvedValue(undefined)
  }
}

function fakeDatabase(
  tx: ReturnType<typeof fakeCrudTransaction> | null
): AbstractPowerSyncDatabase {
  return {
    getNextCrudTransaction: jest.fn().mockResolvedValue(tx)
  } as unknown as AbstractPowerSyncDatabase
}

// ── Lifecycle ───────────────────────────────────────────────────────────────

let consoleErrorSpy: jest.SpyInstance
let outbox: SyncOutbox

beforeEach(() => {
  outbox = createSyncOutbox({ now: () => 1_700_000_000_000 })
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
})

// ── fetchCredentials ────────────────────────────────────────────────────────

describe('createPowerSyncConnector — fetchCredentials', () => {
  it('returns credentials from transport on first call', async () => {
    const transport = fakeTransport()
    const connector = createPowerSyncConnector({ transport, outbox })

    const creds = await connector.fetchCredentials()

    expect(creds).toMatchObject({
      endpoint: 'https://ps.test.local',
      token: 'tok_test'
    })
    expect(transport.calls.token).toBe(1)
  })

  it('returns cached credentials on subsequent calls', async () => {
    const transport = fakeTransport()
    const connector = createPowerSyncConnector({ transport, outbox })

    await connector.fetchCredentials()
    await connector.fetchCredentials()
    await connector.fetchCredentials()

    expect(transport.calls.token).toBe(1)
  })

  it('refetches when within 30s of expiry', async () => {
    const clock = fakeClock(1_000_000)
    let counter = 0
    const transport = fakeTransport({
      token: async () => ({
        endpoint: 'https://ps.test.local',
        token: `tok_${++counter}`,
        expiresAt: new Date(clock.now() + 60_000)
      })
    })
    const connector = createPowerSyncConnector({
      transport,
      outbox,
      now: clock.now
    })

    const first = await connector.fetchCredentials()
    expect(first?.token).toBe('tok_1')

    // Advance 40s — cache expires in 20s, which is inside the 30s buffer.
    clock.advance(40_000)
    const second = await connector.fetchCredentials()
    expect(second?.token).toBe('tok_2')
    expect(transport.calls.token).toBe(2)
  })

  it('uses cache while still outside the 30s expiry buffer', async () => {
    const clock = fakeClock(1_000_000)
    const transport = fakeTransport({
      token: async () => ({
        endpoint: 'https://ps.test.local',
        token: 'tok_stable',
        expiresAt: new Date(clock.now() + 60_000)
      })
    })
    const connector = createPowerSyncConnector({
      transport,
      outbox,
      now: clock.now
    })

    await connector.fetchCredentials()
    clock.advance(29_000) // expires in 31s — still outside 30s buffer
    await connector.fetchCredentials()

    expect(transport.calls.token).toBe(1)
  })

  it('clears cache and calls onAuthExpired on auth error', async () => {
    const onAuthExpired = jest.fn()
    let failNext = true
    const transport = fakeTransport({
      token: async () => {
        if (failNext) {
          failNext = false
          throw new ORPCError('UNAUTHORIZED', { message: 'Unauthorized' })
        }
        return defaultCredentials()
      }
    })
    const connector = createPowerSyncConnector({
      transport,
      outbox,
      onAuthExpired
    })

    await expect(connector.fetchCredentials()).rejects.toThrow('Unauthorized')
    expect(onAuthExpired).toHaveBeenCalledTimes(1)

    // Cache was cleared — a second call must re-hit the transport.
    const creds = await connector.fetchCredentials()
    expect(creds?.token).toBe('tok_test')
    expect(transport.calls.token).toBe(2)
  })

  it('throws non-auth errors without firing onAuthExpired', async () => {
    const onAuthExpired = jest.fn()
    const transport = fakeTransport({
      token: async () => {
        throw new Error('server down')
      }
    })
    const connector = createPowerSyncConnector({
      transport,
      outbox,
      onAuthExpired
    })

    await expect(connector.fetchCredentials()).rejects.toThrow('server down')
    expect(onAuthExpired).not.toHaveBeenCalled()
  })
})

// ── uploadData ──────────────────────────────────────────────────────────────

describe('createPowerSyncConnector — uploadData', () => {
  it('returns early when there is no pending transaction', async () => {
    const transport = fakeTransport()
    const connector = createPowerSyncConnector({ transport, outbox })

    await connector.uploadData(fakeDatabase(null))

    expect(transport.calls.writes).toHaveLength(0)
  })

  it('maps CRUD ops and calls applyWrite for each, completing on success', async () => {
    const transport = fakeTransport()
    const connector = createPowerSyncConnector({ transport, outbox })
    const tx = fakeCrudTransaction([
      { op: UpdateType.DELETE, table: 'session', id: 'id1' },
      {
        op: UpdateType.PATCH,
        table: 'generator',
        id: 'id2',
        opData: { name: 'G1' }
      },
      {
        op: UpdateType.PUT,
        table: 'organization',
        id: 'id3',
        opData: { name: 'Org' }
      }
    ])

    await connector.uploadData(fakeDatabase(tx))

    expect(transport.calls.writes).toEqual([
      { table: 'session', op: 'delete', id: 'id1', data: undefined },
      { table: 'generator', op: 'update', id: 'id2', data: { name: 'G1' } },
      { table: 'organization', op: 'insert', id: 'id3', data: { name: 'Org' } }
    ])
    expect(tx.complete).toHaveBeenCalledTimes(1)
  })

  it('sinks structured rejection and completes the transaction', async () => {
    const transport = fakeTransport({
      applyWrite: async () => ({
        ok: false,
        rejection: { table: 'generator', message: 'FK violation' }
      })
    })
    const connector = createPowerSyncConnector({ transport, outbox })
    const tx = fakeCrudTransaction([
      { op: UpdateType.PUT, table: 'generator', id: 'g1', opData: {} }
    ])

    await connector.uploadData(fakeDatabase(tx))

    expect(outbox.getRejections()).toEqual([
      {
        table: 'generator',
        op: 'insert',
        id: 'g1',
        reason: 'FK violation',
        timestamp: 1_700_000_000_000
      }
    ])
    expect(tx.complete).toHaveBeenCalledTimes(1)
  })

  it('sinks { ok: false, error } and completes the transaction', async () => {
    const transport = fakeTransport({
      applyWrite: async () => ({ ok: false, error: 'something went wrong' })
    })
    const connector = createPowerSyncConnector({ transport, outbox })
    const tx = fakeCrudTransaction([
      { op: UpdateType.PATCH, table: 'session', id: 's1', opData: {} }
    ])

    await connector.uploadData(fakeDatabase(tx))

    expect(outbox.getRejections()).toEqual([
      {
        table: 'session',
        op: 'update',
        id: 's1',
        reason: 'something went wrong',
        timestamp: 1_700_000_000_000
      }
    ])
    expect(tx.complete).toHaveBeenCalledTimes(1)
  })

  it('records a fallback rejection if server returns ok:false without rejection or error', async () => {
    // Safety net: server should never drift from the contract, but if
    // it does, we record a generic rejection rather than silently drop.
    const transport = fakeTransport({
      applyWrite: async () => ({ ok: false }) as unknown as ApplyWriteResult
    })
    const connector = createPowerSyncConnector({ transport, outbox })
    const tx = fakeCrudTransaction([
      { op: UpdateType.PUT, table: 'generator', id: 'g1', opData: {} }
    ])

    await connector.uploadData(fakeDatabase(tx))

    expect(outbox.getRejections()).toEqual([
      {
        table: 'generator',
        op: 'insert',
        id: 'g1',
        reason:
          'Server returned ok:false without structured rejection or error',
        timestamp: 1_700_000_000_000
      }
    ])
    expect(tx.complete).toHaveBeenCalledTimes(1)
  })

  it('re-throws network errors without completing the transaction', async () => {
    const transport = fakeTransport({
      applyWrite: async () => {
        throw new Error('network timeout')
      }
    })
    const connector = createPowerSyncConnector({ transport, outbox })
    const tx = fakeCrudTransaction([
      { op: UpdateType.PUT, table: 'session', id: 's1', opData: {} }
    ])

    await expect(connector.uploadData(fakeDatabase(tx))).rejects.toThrow(
      'network timeout'
    )

    expect(tx.complete).not.toHaveBeenCalled()
    expect(outbox.getRejections()).toEqual([])
  })

  it('fires onAuthExpired, clears cache, and re-throws on ORPCError UNAUTHORIZED', async () => {
    const onAuthExpired = jest.fn()
    const transport = fakeTransport({
      applyWrite: async () => {
        throw new ORPCError('UNAUTHORIZED', { message: 'Unauthorized' })
      }
    })
    const connector = createPowerSyncConnector({
      transport,
      outbox,
      onAuthExpired
    })
    const tx = fakeCrudTransaction([
      { op: UpdateType.PUT, table: 'session', id: 's1', opData: {} }
    ])

    // Prime the cache so we can prove it was cleared.
    await connector.fetchCredentials()
    expect(transport.calls.token).toBe(1)

    await expect(connector.uploadData(fakeDatabase(tx))).rejects.toThrow(
      'Unauthorized'
    )
    expect(onAuthExpired).toHaveBeenCalledTimes(1)
    expect(tx.complete).not.toHaveBeenCalled()

    // Cache was cleared during the failed upload — next fetch must re-hit transport.
    await connector.fetchCredentials()
    expect(transport.calls.token).toBe(2)
  })

  it('fires onAuthExpired on a plain Error whose message contains 401', async () => {
    // Covers the string-matching branch of auth classification — real
    // HTTP 401s come back as plain Errors, not ORPCError instances.
    const onAuthExpired = jest.fn()
    const transport = fakeTransport({
      applyWrite: async () => {
        throw new Error('Request failed with status 401')
      }
    })
    const connector = createPowerSyncConnector({
      transport,
      outbox,
      onAuthExpired
    })
    const tx = fakeCrudTransaction([
      { op: UpdateType.PUT, table: 'session', id: 's1', opData: {} }
    ])

    await expect(connector.uploadData(fakeDatabase(tx))).rejects.toThrow('401')

    expect(onAuthExpired).toHaveBeenCalledTimes(1)
    expect(tx.complete).not.toHaveBeenCalled()
  })

  it('completes and sinks rejection on auth_forbidden via SQLSTATE 28', async () => {
    const error = Object.assign(new Error('invalid authorization'), {
      code: '28000'
    })
    const transport = fakeTransport({
      applyWrite: async () => {
        throw error
      }
    })
    const connector = createPowerSyncConnector({ transport, outbox })
    const tx = fakeCrudTransaction([
      { op: UpdateType.PUT, table: 'generator', id: 'g1', opData: {} }
    ])

    await connector.uploadData(fakeDatabase(tx))

    expect(tx.complete).toHaveBeenCalledTimes(1)
    expect(outbox.getRejections()).toEqual([
      {
        table: 'generator',
        op: 'insert',
        id: 'g1',
        reason: 'invalid authorization',
        timestamp: 1_700_000_000_000
      }
    ])
  })

  it('completes and sinks rejection on auth_forbidden via 403 message', async () => {
    const transport = fakeTransport({
      applyWrite: async () => {
        throw new Error('403 Forbidden')
      }
    })
    const connector = createPowerSyncConnector({ transport, outbox })
    const tx = fakeCrudTransaction([
      { op: UpdateType.PUT, table: 'generator', id: 'g1', opData: {} }
    ])

    await connector.uploadData(fakeDatabase(tx))

    expect(tx.complete).toHaveBeenCalledTimes(1)
    expect(outbox.getRejections()).toEqual([
      {
        table: 'generator',
        op: 'insert',
        id: 'g1',
        reason: '403 Forbidden',
        timestamp: 1_700_000_000_000
      }
    ])
  })

  it('regression guard: unknown error re-throws without completing or sinking', async () => {
    // The bug fix. On the pre-refactor code, an unrecognised error was
    // classified as permanent-failure and the upload loop called
    // `transaction.complete()`, silently dropping the op from the sync
    // queue. The safe default is *retry*: re-throw so PowerSync's SDK
    // backs off and replays the transaction.
    const transport = fakeTransport({
      applyWrite: async () => {
        throw new Error('totally weird error')
      }
    })
    const connector = createPowerSyncConnector({ transport, outbox })
    const tx = fakeCrudTransaction([
      { op: UpdateType.PUT, table: 'generator', id: 'g1', opData: {} }
    ])

    await expect(connector.uploadData(fakeDatabase(tx))).rejects.toThrow(
      'totally weird error'
    )

    expect(tx.complete).not.toHaveBeenCalled()
    expect(outbox.getRejections()).toEqual([])
    // Logger is called so operators can see the classification in logs.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[sync] upload failed',
      expect.objectContaining({
        classification: { kind: 'unknown', action: 'retry' }
      })
    )
  })
})
