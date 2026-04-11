import React, { createContext, useContext } from 'react'

import type { authClient } from './auth-client'

export type BetterAuthSession = ReturnType<typeof authClient.useSession>['data']

export interface SessionSnapshot {
  data: BetterAuthSession
  isPending: boolean
}

export interface SessionFetchResult {
  data: BetterAuthSession
  error: unknown
}

export interface SessionRuntime {
  useSession(): SessionSnapshot
  getSession(): Promise<SessionFetchResult>
  isOnline(): Promise<boolean>
  onConnectivityChange(listener: (online: boolean) => void): () => void
  onForeground(listener: () => void): () => void
}

const SessionRuntimeContext = createContext<SessionRuntime | null>(null)

export function SessionRuntimeProvider({
  runtime,
  children
}: {
  runtime: SessionRuntime
  children: React.ReactNode
}) {
  return (
    <SessionRuntimeContext.Provider value={runtime}>
      {children}
    </SessionRuntimeContext.Provider>
  )
}

export function useSessionRuntime(): SessionRuntime {
  const ctx = useContext(SessionRuntimeContext)
  if (!ctx)
    throw new Error(
      'useSessionRuntime must be used inside SessionRuntimeProvider'
    )
  return ctx
}
