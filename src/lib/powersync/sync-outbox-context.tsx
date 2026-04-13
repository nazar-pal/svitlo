import React, { createContext, useContext, useSyncExternalStore } from 'react'

import type { SyncOutbox, SyncRejectionEntry } from './sync-outbox'

const SyncOutboxContext = createContext<SyncOutbox | null>(null)

export function SyncOutboxProvider({
  outbox,
  children
}: {
  outbox: SyncOutbox
  children: React.ReactNode
}) {
  return (
    <SyncOutboxContext.Provider value={outbox}>
      {children}
    </SyncOutboxContext.Provider>
  )
}

export function useSyncOutbox(): SyncOutbox {
  const ctx = useContext(SyncOutboxContext)
  if (!ctx)
    throw new Error('useSyncOutbox must be used inside SyncOutboxProvider')
  return ctx
}

export function useSyncRejections(): readonly SyncRejectionEntry[] {
  const outbox = useSyncOutbox()
  return useSyncExternalStore(
    outbox.subscribe,
    outbox.getRejections,
    outbox.getRejections
  )
}
