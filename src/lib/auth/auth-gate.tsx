import { Stack } from 'expo-router'
import React from 'react'

import { AuthBootstrapScreen } from './auth-bootstrap-screen'
import { useAuthSession } from './session'

export function AuthGate() {
  const { phase } = useAuthSession()

  if (phase === 'loading') {
    return <AuthBootstrapScreen />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={phase === 'anonymous'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={phase === 'incomplete-profile'}>
        <Stack.Screen name="(complete-profile)" />
      </Stack.Protected>
      <Stack.Protected guard={phase === 'authenticated'}>
        <Stack.Screen name="(protected)" />
      </Stack.Protected>
    </Stack>
  )
}
