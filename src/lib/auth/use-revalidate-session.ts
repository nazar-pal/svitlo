import { useEffect, useRef, useState } from 'react'

import { useLocalIdentity } from './local-identity-context'
import type { LocalIdentity } from './offline-identity'
import { persistLocalIdentity } from './offline-identity'
import type { BetterAuthSession } from './session-runtime'
import { useSessionRuntime } from './session-runtime'
import { useSessionStatus } from './session-status-context'

const RETRY_DELAY_MS = 5_000

export interface UseRevalidateSessionResult {
  // True while the app should show the cold-start spinner: either the local
  // identity has not loaded yet, or Better Auth is still resolving its cached
  // session and we have no stored identity to fall back on, and the first
  // revalidation pass has not completed.
  isBootstrapping: boolean
  identity: LocalIdentity | null
  session: BetterAuthSession
}

export function useRevalidateSession(): UseRevalidateSessionResult {
  const runtime = useSessionRuntime()
  const { data: session, isPending } = runtime.useSession()
  const {
    identity,
    isLoading: isIdentityLoading,
    applyIdentity
  } = useLocalIdentity()
  const { setSessionStatus } = useSessionStatus()

  const [isRevalidated, setIsRevalidated] = useState(false)
  const revalidationInFlightRef = useRef(false)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function revalidate() {
    if (revalidationInFlightRef.current || isPending) return
    revalidationInFlightRef.current = true

    try {
      // Better Auth has a valid session in memory — persist the userId and done.
      if (session?.user?.id) {
        const next = await persistLocalIdentity(session.user.id)
        applyIdentity(next)
        setSessionStatus('valid')
        return
      }

      // No cached session. If offline, trust the stored identity as-is.
      if (!(await runtime.isOnline())) return

      // Online with no cached session — ask the server.
      const result = await runtime.getSession()

      if (result.data?.user?.id) {
        const next = await persistLocalIdentity(result.data.user.id)
        applyIdentity(next)
        setSessionStatus('valid')
      } else if (!result.error) {
        // Server confirmed: no valid session. Mark as expired but do NOT clear
        // the local identity — the user keeps full access to their local data.
        setSessionStatus('expired')
      }
      // result.error means a network/server failure — retry once after a short
      // delay to handle transient errors on reconnect.
      if (result.error) scheduleRetry()
    } finally {
      revalidationInFlightRef.current = false
      setIsRevalidated(true)
    }
  }

  function scheduleRetry() {
    if (retryTimerRef.current) return
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null
      void revalidateRef.current()
    }, RETRY_DELAY_MS)
  }

  const revalidateRef = useRef(revalidate)
  revalidateRef.current = revalidate

  useEffect(() => {
    void revalidateRef.current()
  }, [isPending, session])

  useEffect(() => {
    const unsubscribeForeground = runtime.onForeground(() => {
      void revalidateRef.current()
    })
    const unsubscribeConnectivity = runtime.onConnectivityChange(online => {
      if (online) void revalidateRef.current()
    })
    return () => {
      unsubscribeForeground()
      unsubscribeConnectivity()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [runtime])

  const isBootstrapping =
    (isIdentityLoading || (!identity && isPending)) && !isRevalidated

  return { isBootstrapping, identity, session }
}
