import React, { createContext, useContext, useState } from 'react'

export type SessionStatus = 'valid' | 'expired' | 'unknown'

interface SessionStatusContextValue {
  sessionStatus: SessionStatus
  setSessionStatus: (status: SessionStatus) => void
}

const SessionStatusContext = createContext<SessionStatusContextValue | null>(
  null
)

export function SessionStatusProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('unknown')

  return (
    <SessionStatusContext.Provider value={{ sessionStatus, setSessionStatus }}>
      {children}
    </SessionStatusContext.Provider>
  )
}

export function useSessionStatus(): SessionStatusContextValue {
  const ctx = useContext(SessionStatusContext)
  if (!ctx) {
    throw new Error(
      'useSessionStatus must be used inside SessionStatusProvider'
    )
  }
  return ctx
}
