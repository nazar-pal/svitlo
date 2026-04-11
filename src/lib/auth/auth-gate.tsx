import { Stack } from 'expo-router'
import React, { useEffect } from 'react'

import { useReadinessDispatch } from '@/lib/app-readiness/context'

import { AuthBootstrapScreen } from './auth-bootstrap-screen'
import { SessionStatusProvider } from './session-status-context'
import { useRevalidateSession } from './use-revalidate-session'

function AuthGateInner() {
  const { isBootstrapping, identity, session } = useRevalidateSession()
  const dispatch = useReadinessDispatch()

  const isAuthenticated = identity !== null
  const hasCompleteName = !session || Boolean(session.user?.name?.trim())

  // Incomplete profile is treated as "no identity yet" for readiness purposes:
  // (complete-profile) never mounts PowerSync, so advancing into initializing-db
  // would stall on the 15s deadline and surface the error screen.
  const readyForProtectedTree = isAuthenticated && hasCompleteName

  useEffect(() => {
    if (isBootstrapping) return
    dispatch({ type: 'identity-resolved', hasIdentity: readyForProtectedTree })
  }, [isBootstrapping, readyForProtectedTree, dispatch])

  if (isBootstrapping) {
    return <AuthBootstrapScreen />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && !hasCompleteName}>
        <Stack.Screen name="(complete-profile)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated && hasCompleteName}>
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
