import React, { createContext, useContext } from 'react'

import { useStartupState } from '@/lib/app-startup/coordinator'

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
  const { phase } = useStartupState()
  const isReady = phase === 'first-sync' || phase === 'ready'

  return (
    <AppPowerSyncContext.Provider value={{ userId, isReady }}>
      {children}
    </AppPowerSyncContext.Provider>
  )
}

export function usePowerSync(): PowerSyncContextValue {
  const ctx = useContext(AppPowerSyncContext)
  if (!ctx) {
    throw new Error('usePowerSync must be used inside PowerSyncProvider')
  }
  return ctx
}
