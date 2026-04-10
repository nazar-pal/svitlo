import {
  UpdateType,
  type AbstractPowerSyncDatabase,
  type CrudEntry,
  type PowerSyncBackendConnector,
  type PowerSyncCredentials
} from '@powersync/react-native'
import { ORPCError } from '@orpc/client'

import { rpcClient } from '@/data/client/rpc-client'

import { addRejection } from './sync-rejections'

// ── Public types ────────────────────────────────────────────────────────────

export interface CrudWrite {
  table: string
  op: 'insert' | 'update' | 'delete'
  id: string
  data: Record<string, unknown> | undefined
}

export type ApplyWriteResult =
  | { ok: true }
  | { ok: false; rejection: { table: string; message: string } }
  | { ok: false; error: string }

/**
 * Port for the remote sync backend. Production wires this to the oRPC
 * client; tests pass an in-memory fake. This is the only externalised
 * dependency of the connector — everything else (classification,
 * rejection store, logging) is in-process and called directly.
 */
export interface SyncTransport {
  fetchToken(): Promise<PowerSyncCredentials>
  applyWrite(write: CrudWrite): Promise<ApplyWriteResult>
}

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Build a PowerSync backend connector. Returns an object satisfying the
 * SDK's `PowerSyncBackendConnector` contract, ready to hand to
 * `powersync.connect()`.
 *
 * The credential cache is per-instance closure state — discarding the
 * connector (on disconnect) discards the cache. No module-level state.
 *
 * Testing: inject `transport` with an in-memory fake to drive the
 * upload pipeline; inject `now` for deterministic cache-expiry tests.
 */
export function createPowerSyncConnector(opts: {
  onAuthExpired?: () => void
  transport?: SyncTransport
  now?: () => number
}): PowerSyncBackendConnector {
  const transport = opts.transport ?? defaultTransport()
  const now = opts.now ?? Date.now

  let cachedCredentials: PowerSyncCredentials | null = null

  async function fetchCredentials(): Promise<PowerSyncCredentials> {
    if (
      cachedCredentials?.expiresAt &&
      cachedCredentials.expiresAt.getTime() > now() + 30_000
    )
      return cachedCredentials

    try {
      cachedCredentials = await transport.fetchToken()
      return cachedCredentials
    } catch (error) {
      if (classifyError(error).kind === 'auth_expired') {
        cachedCredentials = null
        opts.onAuthExpired?.()
      }
      throw error
    }
  }

  async function uploadData(
    database: AbstractPowerSyncDatabase
  ): Promise<void> {
    const transaction = await database.getNextCrudTransaction()
    if (!transaction) return

    let lastOp: { table: string; op: CrudWrite['op']; id: string } | null = null

    try {
      for (const op of transaction.crud) {
        const write = mapCrudOp(op)
        lastOp = { table: write.table, op: write.op, id: write.id }

        const result = await transport.applyWrite(write)
        if (result.ok) continue

        if ('rejection' in result && result.rejection) {
          addRejection({
            table: result.rejection.table,
            op: write.op,
            id: write.id,
            reason: result.rejection.message
          })
          continue
        }

        // Either `{ ok: false, error: string }` or — if the server ever
        // drifts from the contract — a malformed response missing both
        // fields. Either way, record it rather than silently drop.
        const reason =
          'error' in result && typeof result.error === 'string'
            ? result.error
            : 'Server returned ok:false without structured rejection or error'

        addRejection({
          table: write.table,
          op: write.op,
          id: write.id,
          reason
        })
      }

      // Every op processed (each either uploaded cleanly or recorded as
      // a rejection). Advance the upload queue past this transaction.
      await transaction.complete()
    } catch (error) {
      const classification = classifyError(error)

      console.error('[sync] upload failed', { classification, lastOp, error })

      if (classification.kind === 'auth_expired') {
        cachedCredentials = null
        opts.onAuthExpired?.()
      }

      if (classification.action === 'drop' && lastOp) {
        // Only positively-identified permanent failures land here. An
        // `unknown` classification re-throws (see the default branch
        // below) so PowerSync retries with backoff — dropping an
        // unrecognised error would silently advance the queue past a
        // failing op and lose data.
        addRejection({
          table: lastOp.table,
          op: lastOp.op,
          id: lastOp.id,
          reason: error instanceof Error ? error.message : String(error)
        })
        await transaction.complete()
        return
      }

      // Default: retry. PowerSync's SDK will back off and call us again.
      throw error
    }
  }

  return { fetchCredentials, uploadData }
}

// ── Internal ────────────────────────────────────────────────────────────────

type ErrorClassification =
  | { kind: 'auth_expired'; action: 'retry' }
  | { kind: 'network'; action: 'retry' }
  | { kind: 'auth_forbidden'; action: 'drop' }
  | { kind: 'unknown'; action: 'retry' }

/**
 * Classify an error thrown from the upload pipeline. Pure, no I/O.
 *
 * Rule order (first match wins):
 *  1. `ORPCError.code === 'UNAUTHORIZED'` or 401/unauthorized in message → auth_expired
 *  2. Network-keyword message or structured SQLSTATE class 08           → network
 *  3. 403/forbidden message or structured SQLSTATE class 28             → auth_forbidden
 *  4. Default                                                           → unknown (retry)
 *
 * The safe default is *retry*, not drop. PowerSync's contract is "throw
 * on upload errors so the SDK can back off" — dropping an unrecognised
 * error silently advances the sync queue past the failing op and loses
 * data. Known-permanent failures (auth_forbidden) are the only ones
 * that drop. Everything else is re-thrown so PowerSync retries with
 * backoff.
 *
 * Constraint violations (SQLSTATE 22/23/P0001) are intentionally *not*
 * classified here — the server translates them into structured
 * `{ ok: false, rejection }` responses before they reach the classifier.
 */
function classifyError(error: unknown): ErrorClassification {
  if (error instanceof ORPCError && error.code === 'UNAUTHORIZED')
    return { kind: 'auth_expired', action: 'retry' }

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase()

  if (message.includes('401') || message.includes('unauthorized'))
    return { kind: 'auth_expired', action: 'retry' }

  const sqlStateClass = structuredSqlStateClass(error)

  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    sqlStateClass === '08'
  )
    return { kind: 'network', action: 'retry' }

  if (
    message.includes('403') ||
    message.includes('forbidden') ||
    sqlStateClass === '28'
  )
    return { kind: 'auth_forbidden', action: 'drop' }

  return { kind: 'unknown', action: 'retry' }
}

/**
 * Narrow structural lookup for a PostgreSQL SQLSTATE class. Only returns
 * the classes the classifier cares about (08 = connection, 28 = invalid
 * authorization).
 */
function structuredSqlStateClass(error: unknown): '08' | '28' | null {
  if (!error || typeof error !== 'object') return null
  const rec = error as Record<string, unknown>
  const raw =
    typeof rec.code === 'string'
      ? rec.code
      : typeof rec.sqlState === 'string'
        ? rec.sqlState
        : null
  if (!raw || !/^\d{5}$/.test(raw)) return null
  if (raw.startsWith('08')) return '08'
  if (raw.startsWith('28')) return '28'
  return null
}

function mapCrudOp(op: CrudEntry): CrudWrite {
  const opType: CrudWrite['op'] =
    op.op === UpdateType.DELETE
      ? 'delete'
      : op.op === UpdateType.PATCH
        ? 'update'
        : 'insert'
  return { table: op.table, op: opType, id: op.id, data: op.opData }
}

function defaultTransport(): SyncTransport {
  return {
    async fetchToken() {
      const result = await rpcClient.powersync.token()
      return {
        endpoint: result.endpoint,
        token: result.token,
        expiresAt: new Date(result.expiresAt)
      }
    },
    async applyWrite(write) {
      return rpcClient.powersync.applyWrite({
        table: write.table,
        op: write.op,
        id: write.id,
        data: write.data
      })
    }
  }
}
