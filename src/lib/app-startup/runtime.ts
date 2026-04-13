import type { PowerSyncBackendConnector } from '@powersync/react-native'

import { createPowerSyncConnector } from '@/lib/powersync/connector'
import { powersync } from '@/lib/powersync/database'
import type { SyncOutbox } from '@/lib/powersync/sync-outbox'

export interface PowerSyncRuntime {
  init(): Promise<void>
  connect(): void
  disconnect(): void
}

interface DefaultRuntimeOptions {
  onAuthExpired: () => void
  outbox: SyncOutbox
}

// Ports-and-adapters layer around the PowerSync singleton. The coordinator
// calls these methods; tests inject a controllable fake.
export function createDefaultPowerSyncRuntime(
  opts: DefaultRuntimeOptions
): PowerSyncRuntime {
  let connector: PowerSyncBackendConnector | null = null
  let connected = false
  let listenerRegistered = false

  function disconnectIfConnected() {
    if (!connected) return
    powersync.disconnect()
    opts.outbox.clear()
    // The connector's credential cache is closure-scoped — discarding
    // the instance here is sufficient; no manual invalidation needed.
    connector = null
    connected = false
  }

  return {
    async init() {
      if (!listenerRegistered) {
        // TODO: Report these errors to Sentry when it's set up instead of console.error
        powersync.registerListener({
          statusChanged: status => {
            if (status.dataFlowStatus?.downloadError)
              console.error('[powersync] Download error', {
                error: status.dataFlowStatus.downloadError,
                lastSyncedAt: status.lastSyncedAt,
                connected: status.connected
              })
            if (status.dataFlowStatus?.uploadError)
              console.error('[powersync] Upload error', {
                error: status.dataFlowStatus.uploadError,
                lastSyncedAt: status.lastSyncedAt,
                connected: status.connected
              })
          }
        })
        listenerRegistered = true
      }
      await powersync.init()
    },
    connect() {
      if (connected) return
      connector = createPowerSyncConnector({
        onAuthExpired: opts.onAuthExpired,
        outbox: opts.outbox
      })
      // connect() is fire-and-forget per PowerSync docs
      powersync.connect(connector)
      connected = true
    },
    disconnect() {
      disconnectIfConnected()
    }
  }
}
