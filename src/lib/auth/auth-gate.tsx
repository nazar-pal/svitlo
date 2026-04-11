import { Stack } from 'expo-router'
import React from 'react'

import { AuthBootstrapScreen } from './auth-bootstrap-screen'
import { isProfileComplete } from './session-runtime'
import { useRevalidateSession } from './use-revalidate-session'

export function AuthGate() {
  const { isBootstrapping, identity, session } = useRevalidateSession()

  const isAuthenticated = identity !== null
  const hasCompleteName = isProfileComplete(session)

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
