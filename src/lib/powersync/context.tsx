import {
  PowerSyncContext as NativePowerSyncContext,
  useStatus
} from '@powersync/react-native'
import { Button } from 'heroui-native'
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

import { useLocalIdentity } from '@/lib/auth/local-identity-context'
import { useSessionStatus } from '@/lib/auth/session-status-context'
import { signOut } from '@/lib/auth/sign-out'

import { Connector, clearCredentialCache } from './connector'
import { powersync } from './database'
import { clearRejections } from './sync-rejections'

interface PowerSyncContextValue {
  userId: string | null
  isReady: boolean
}

const AppPowerSyncContext = createContext<PowerSyncContextValue | null>(null)

export function PowerSyncProvider({
  userId,
  children
}: {
  userId: string | null
  children: React.ReactNode
}) {
  const { sessionStatus, setSessionStatus } = useSessionStatus()
  const [isReady, setIsReady] = useState(false)
  const connectorRef = useRef<Connector | null>(null)
  const connectedRef = useRef(false)

  // Open the SQLite database and register status listener on mount
  useEffect(() => {
    powersync
      .init()
      .then(() => setIsReady(true))
      .catch(console.error)

    // TODO: Report these errors to Sentry when it's set up instead of console.error
    const dispose = powersync.registerListener({
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

    return dispose
  }, [])

  // Connect when session is valid, disconnect otherwise
  useEffect(() => {
    if (!isReady || !userId) return

    if (sessionStatus === 'valid') {
      if (!connectedRef.current) {
        connectorRef.current = new Connector(() => setSessionStatus('expired'))
        // connect() is fire-and-forget per PowerSync docs
        powersync.connect(connectorRef.current)
        connectedRef.current = true
      }
    } else {
      // 'expired' or 'unknown': disconnect but keep local data
      if (connectedRef.current) {
        powersync.disconnect()
        clearCredentialCache()
        clearRejections()
        connectorRef.current = null
        connectedRef.current = false
      }
    }

    return () => {
      if (connectedRef.current) {
        powersync.disconnect()
        clearCredentialCache()
        clearRejections()
        connectorRef.current = null
        connectedRef.current = false
      }
    }
  }, [isReady, userId, sessionStatus, setSessionStatus])

  return (
    <AppPowerSyncContext.Provider value={{ userId, isReady }}>
      {/* NativePowerSyncContext enables SDK hooks (useQuery, useStatus) */}
      <NativePowerSyncContext.Provider value={powersync}>
        <SyncGate>{children}</SyncGate>
      </NativePowerSyncContext.Provider>
    </AppPowerSyncContext.Provider>
  )
}

function SyncGate({ children }: { children: React.ReactNode }) {
  const status = useStatus()

  // hasSynced persists in SQLite — after first sync, subsequent launches skip this gate.
  // Priorities still help: PowerSync syncs user/org data (p1) before generators (p2) and
  // sessions/records (p3), so the gate shows meaningful progress as data arrives in order.
  if (!status.hasSynced)
    return <InitialSyncScreen progress={status.downloadProgress} />

  return children
}

function InitialSyncScreen({
  progress
}: {
  progress: { downloadedFraction: number } | null
}) {
  const { applyIdentity } = useLocalIdentity()
  const [showEscape, setShowEscape] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowEscape(true), 15_000)
    return () => clearTimeout(timer)
  }, [])

  const percentage = progress
    ? Math.round(progress.downloadedFraction * 100)
    : null

  async function handleEmergencySignOut() {
    try {
      await powersync.disconnectAndClear()
      clearCredentialCache()
      await signOut()
    } finally {
      applyIdentity(null)
    }
  }

  return (
    <View className="bg-background flex-1 items-center justify-center gap-4 px-8">
      <ActivityIndicator size="small" />
      <Text className="text-muted text-sm">
        {percentage !== null
          ? `Syncing your data… ${percentage}%`
          : 'Syncing your data…'}
      </Text>

      {showEscape ? (
        <View className="mt-6 items-center gap-2">
          <Text className="text-muted text-center text-xs">
            Taking longer than expected?
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={handleEmergencySignOut}
          >
            Sign Out
          </Button>
        </View>
      ) : null}
    </View>
  )
}

export function usePowerSync(): PowerSyncContextValue {
  const ctx = useContext(AppPowerSyncContext)
  if (!ctx) {
    throw new Error('usePowerSync must be used inside PowerSyncProvider')
  }
  return ctx
}
