import * as Network from 'expo-network'
import { Stack } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'

import { AuthBootstrapScreen } from './auth-bootstrap-screen'
import { authClient } from './auth-client'
import { useLocalIdentity } from './local-identity-context'
import { persistLocalIdentity } from './offline-identity'
import {
  SessionStatusProvider,
  useSessionStatus
} from './session-status-context'

function AuthGateInner() {
  const { data: session, isPending } = authClient.useSession()
  const { identity, isLoading, applyIdentity } = useLocalIdentity()
  const { setSessionStatus } = useSessionStatus()
  const [isBootstrapped, setIsBootstrapped] = useState(false)
  const revalidationInFlightRef = useRef(false)

  const isAuthenticated = identity !== null

  // Show the bootstrap spinner only on cold start when we have no stored identity
  // and Better Auth is still resolving its cached session.
  const showBootstrap = isLoading || (!identity && isPending)

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
      const net = await Network.getNetworkStateAsync()
      const isOnline =
        Boolean(net.isConnected) && net.isInternetReachable !== false
      if (!isOnline) return

      // Online with no cached session — ask the server.
      const result = await authClient.getSession()

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
      setIsBootstrapped(true)
    }
  }

  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleRetry() {
    if (retryTimerRef.current) return
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null
      void revalidateRef.current()
    }, 5_000)
  }

  const revalidateRef = useRef(revalidate)
  revalidateRef.current = revalidate

  // Re-run whenever the Better Auth session state changes.
  useEffect(() => {
    void revalidateRef.current()
  }, [isPending, session])

  // Re-run when the app comes to the foreground or regains connectivity.
  useEffect(() => {
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') void revalidateRef.current()
    })
    const network = Network.addNetworkStateListener(state => {
      const isOnline =
        Boolean(state.isConnected) && state.isInternetReachable !== false
      if (isOnline) void revalidateRef.current()
    })
    return () => {
      appState.remove()
      network.remove()
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    }
  }, [])

  if (showBootstrap && !isBootstrapped) {
    return <AuthBootstrapScreen />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(protected)" />
      </Stack.Protected>
    </Stack>
  )
}

export function AuthGate() {
  return (
    <SessionStatusProvider>
      <AuthGateInner />
    </SessionStatusProvider>
  )
}
