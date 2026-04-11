import {
  PowerSyncContext as NativePowerSyncContext,
  useStatus,
  type PowerSyncBackendConnector
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

import { useReadinessDispatch } from '@/lib/app-readiness/context'
import { useSessionStatus } from '@/lib/auth/session-status-context'
import { useEmergencySignOut } from '@/lib/auth/use-emergency-sign-out'

import { createPowerSyncConnector } from './connector'
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
  const dispatch = useReadinessDispatch()
  const [isReady, setIsReady] = useState(false)
  const connectorRef = useRef<PowerSyncBackendConnector | null>(null)
  const connectedRef = useRef(false)

  function disconnectIfConnected() {
    if (!connectedRef.current) return
    powersync.disconnect()
    clearRejections()
    // The connector's credential cache is closure-scoped — discarding
    // the instance here is sufficient; no manual invalidation needed.
    connectorRef.current = null
    connectedRef.current = false
  }

  // Open the SQLite database and register status listener on mount.
  // retry-db-init unmounts this provider via ReadinessGate and remounts it,
  // so this effect is what retries powersync.init() after a prior failure.
  useEffect(() => {
    powersync
      .init()
      .then(() => {
        setIsReady(true)
        dispatch({ type: 'db-init-succeeded' })
      })
      .catch(error => {
        console.error(error)
        dispatch({
          type: 'db-init-failed',
          message: error instanceof Error ? error.message : String(error)
        })
      })

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
  }, [dispatch])

  // Connect when session is valid, disconnect otherwise
  useEffect(() => {
    if (!isReady || !userId) return

    if (sessionStatus === 'valid') {
      if (!connectedRef.current) {
        connectorRef.current = createPowerSyncConnector({
          onAuthExpired: () => setSessionStatus('expired')
        })
        // connect() is fire-and-forget per PowerSync docs
        powersync.connect(connectorRef.current)
        connectedRef.current = true
      }
    } else {
      // 'expired' or 'unknown': disconnect but keep local data
      disconnectIfConnected()
    }

    return disconnectIfConnected
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
  const { isReady } = usePowerSync()
  const dispatch = useReadinessDispatch()

  // The splash itself is hidden earlier: the readiness reducer marks
  // splashHidden on entering the first-sync phase (dispatched from db-init-
  // succeeded above), so the user sees InitialSyncScreen progress on first
  // launch. This dispatch advances past first-sync once the initial sync
  // actually completes, unlocking rendering-home and then ready.
  useEffect(() => {
    if (isReady && status.hasSynced) dispatch({ type: 'first-sync-completed' })
  }, [isReady, status.hasSynced, dispatch])

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
  const handleEmergencySignOut = useEmergencySignOut()
  const [showEscape, setShowEscape] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowEscape(true), 15_000)
    return () => clearTimeout(timer)
  }, [])

  const percentage = progress
    ? Math.round(progress.downloadedFraction * 100)
    : null

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
          <Button variant="ghost" size="sm" onPress={handleEmergencySignOut}>
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
