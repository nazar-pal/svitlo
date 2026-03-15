import {
  PowerSyncContext as NativePowerSyncContext,
  useStatus
} from '@powersync/react-native'
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

import { useSessionStatus } from '@/lib/auth/session-status-context'

import { Connector } from './connector'
import { powersync } from './database'

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
  const { sessionStatus } = useSessionStatus()
  const [isReady, setIsReady] = useState(false)
  const connectorRef = useRef<Connector | null>(null)
  const connectedRef = useRef(false)

  // Open the SQLite database on mount
  useEffect(() => {
    powersync
      .init()
      .then(() => setIsReady(true))
      .catch(console.error)
  }, [])

  // Connect when session is valid, disconnect otherwise
  useEffect(() => {
    if (!isReady || !userId) return

    if (sessionStatus === 'valid') {
      if (!connectedRef.current) {
        connectorRef.current = new Connector()
        // connect() is fire-and-forget per PowerSync docs
        powersync.connect(connectorRef.current)
        connectedRef.current = true
      }
    } else {
      // 'expired' or 'unknown': disconnect but keep local data
      if (connectedRef.current) {
        powersync.disconnect()
        connectorRef.current = null
        connectedRef.current = false
      }
    }

    return () => {
      if (connectedRef.current) {
        powersync.disconnect()
        connectorRef.current = null
        connectedRef.current = false
      }
    }
  }, [isReady, userId, sessionStatus])

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

  // hasSynced persists in SQLite — after first sync, subsequent launches skip this gate
  if (!status.hasSynced)
    return <InitialSyncScreen progress={status.downloadProgress} />

  return children
}

function InitialSyncScreen({
  progress
}: {
  progress: { downloadedFraction: number } | null
}) {
  const percentage = progress
    ? Math.round(progress.downloadedFraction * 100)
    : null

  return (
    <View className="bg-background flex-1 items-center justify-center gap-4">
      <ActivityIndicator size="small" />
      <Text className="text-muted text-sm">
        {percentage !== null
          ? `Syncing your data… ${percentage}%`
          : 'Syncing your data…'}
      </Text>
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
