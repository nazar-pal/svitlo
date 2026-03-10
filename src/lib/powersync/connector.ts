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

function categorizeError(error: unknown): ErrorCategory {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase()

  // Constraint violations — client-side validation gap, not recoverable by retry
  if (
    message.includes('constraint') ||
    message.includes('sqlstate: 23') ||
    message.includes('code: 23')
  )
    return { category: 'constraint_violation', isRecoverable: false }

  // Network errors — transient, PowerSync will retry
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('etimedout') ||
    message.includes('econnrefused') ||
    message.includes('econnreset')
  )
    return { category: 'network', isRecoverable: true }

  // Auth errors
  if (message.includes('403') || message.includes('forbidden'))
    return { category: 'auth_forbidden', isRecoverable: false }
  if (message.includes('401') || message.includes('unauthorized'))
    return { category: 'auth_expired', isRecoverable: true }

  return { category: 'unknown', isRecoverable: false }
}
