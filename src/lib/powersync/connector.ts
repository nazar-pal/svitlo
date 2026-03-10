import type {
  AbstractPowerSyncDatabase,
  PowerSyncBackendConnector,
  PowerSyncCredentials
} from '@powersync/react-native'
import { UpdateType } from '@powersync/react-native'

import { trpcClient } from '@/data/trpc/react'

let cachedCredentials: PowerSyncCredentials | null = null

export class Connector implements PowerSyncBackendConnector {
  async fetchCredentials(): Promise<PowerSyncCredentials> {
    // Return cached credentials if still valid (with 30s buffer)
    if (
      cachedCredentials?.expiresAt &&
      cachedCredentials.expiresAt.getTime() > Date.now() + 30_000
    ) {
      return cachedCredentials
    }

    const result = await trpcClient.powersync.token.query()

    cachedCredentials = {
      endpoint: result.endpoint,
      token: result.token,
      expiresAt: new Date(result.expiresAt)
    }

    return cachedCredentials
  }

  // On failure, the error propagates and PowerSync backs off and retries automatically.
  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction()
    if (!transaction) return

    for (const op of transaction.crud) {
      const opType =
        op.op === UpdateType.DELETE
          ? 'delete'
          : op.op === UpdateType.PATCH
            ? 'update'
            : 'insert'

      // Map local table names to server table names
      const serverTable = op.table === 'user' ? 'user' : op.table

      await trpcClient.powersync.applyWrite.mutate({
        table: serverTable,
        op: opType,
        id: op.id,
        data: op.opData
      })
    }

    // MUST call complete() to advance the queue — stalls permanently otherwise
    await transaction.complete()
  }
}

export function clearCredentialCache() {
  cachedCredentials = null
}
