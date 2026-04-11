import React, { createContext, useContext } from 'react'

import type { authClient } from './auth-client'

export type BetterAuthSession = ReturnType<typeof authClient.useSession>['data']

// A profile is "complete" when there's no live session (offline-with-stored-
// identity flows trust the previous state) or the session's user.name is set.
// Both AuthGate and StartupCoordinator route on this — keep them aligned by
// reading from the same Better Auth session via this single helper.
export function isProfileComplete(session: BetterAuthSession): boolean {
  return !session || Boolean(session.user?.name?.trim())
}

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
