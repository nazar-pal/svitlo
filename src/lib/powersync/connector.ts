import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials
} from '@powersync/react-native'
import { UpdateType } from '@powersync/react-native'

import type { SyncRejection } from '@/data/server/api/routers/powersync'
import { trpcClient } from '@/data/trpc/react'

let cachedCredentials: PowerSyncCredentials | null = null

export class Connector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    // Return cached credentials if still valid (with 30s buffer)
    if (
      cachedCredentials?.expiresAt &&
      cachedCredentials.expiresAt.getTime() > Date.now() + 30_000
    )
      return cachedCredentials

    const result = await trpcClient.powersync.token.query()

    cachedCredentials = {
      endpoint: result.endpoint,
      token: result.token,
      expiresAt: new Date(result.expiresAt)
    }

    return cachedCredentials
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction()
    if (!transaction) return

    let lastOp: { table: string; op: string; id: string } | null = null

    try {
      for (const op of transaction.crud) {
        const opType =
          op.op === UpdateType.DELETE
            ? 'delete'
            : op.op === UpdateType.PATCH
              ? 'update'
              : 'insert'

        const serverTable = op.table === 'user' ? 'user' : op.table
        lastOp = { table: serverTable, op: opType, id: op.id }

        const result = await trpcClient.powersync.applyWrite.mutate({
          table: serverTable,
          op: opType,
          id: op.id,
          data: op.opData
        })

        if (!result.ok) {
          if ('rejection' in result && result.rejection)
            this.logRejection(result.rejection, opType, op.id)
          else if ('error' in result)
            console.error(
              `[sync] ${serverTable}.${opType} (${op.id}) denied:`,
              result.error
            )
        }
      }

      // MUST call complete() to advance the queue — stalls permanently otherwise
      await transaction.complete()
    } catch (error) {
      const { category, isRecoverable } = categorizeError(error)

      console.error(`[sync] Upload failed (${category}):`, {
        table: lastOp?.table,
        op: lastOp?.op,
        id: lastOp?.id,
        recoverable: isRecoverable,
        error
      })

      // Re-throw to block the queue and preserve operation ordering.
      // PowerSync will back off and retry automatically.
      throw error
    }
  }

  private logRejection(rejection: SyncRejection, op: string, recordId: string) {
    console.error(`[sync] Constraint rejection:`, {
      table: rejection.table,
      op,
      recordId,
      code: rejection.code,
      constraint: rejection.constraint,
      message: rejection.message
    })
  }
}

export function clearCredentialCache() {
  cachedCredentials = null
}

// ── Error categorization ────────────────────────────────────────────────────

interface ErrorCategory {
  category: string
  isRecoverable: boolean
}

/**
 * Extract a PostgreSQL SQLSTATE code from the error if present.
 * Postgres errors typically include a 5-character code like '23505'.
 */
function extractSqlState(error: unknown): string | null {
  if (error && typeof error === 'object') {
    const rec = error as Record<string, unknown>
    if (typeof rec.code === 'string' && /^\d{5}$/.test(rec.code))
      return rec.code
    if (typeof rec.sqlState === 'string' && /^\d{5}$/.test(rec.sqlState))
      return rec.sqlState
    if (
      rec.cause &&
      typeof rec.cause === 'object' &&
      typeof (rec.cause as Record<string, unknown>).code === 'string'
    ) {
      const causeCode = (rec.cause as Record<string, unknown>).code as string
      if (/^\d{5}$/.test(causeCode)) return causeCode
    }
  }
  // Fallback: try to extract from message string (e.g. "SQLSTATE: 23505")
  const message = error instanceof Error ? error.message : String(error)
  const match = message.match(/(?:sqlstate|code)[:\s]*(\d{5})/i)
  return match?.[1] ?? null
}

function categorizeError(error: unknown): ErrorCategory {
  // Try structured SQLSTATE first — more reliable than string matching
  const sqlState = extractSqlState(error)
  if (sqlState) {
    // Class 23 = integrity constraint violation (23000, 23502, 23503, 23505, 23514)
    if (sqlState.startsWith('23'))
      return { category: 'constraint_violation', isRecoverable: false }
    // Class 08 = connection exception
    if (sqlState.startsWith('08'))
      return { category: 'network', isRecoverable: true }
    // Class 28 = invalid authorization
    if (sqlState.startsWith('28'))
      return { category: 'auth_forbidden', isRecoverable: false }
  }

  // Fallback to message matching for non-Postgres errors (network, HTTP, etc.)
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase()

  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnrefused') ||
    message.includes('econnreset')
  )
    return { category: 'network', isRecoverable: true }

  if (message.includes('403') || message.includes('forbidden'))
    return { category: 'auth_forbidden', isRecoverable: false }
  if (message.includes('401') || message.includes('unauthorized'))
    return { category: 'auth_expired', isRecoverable: true }

  return { category: 'unknown', isRecoverable: false }
}
