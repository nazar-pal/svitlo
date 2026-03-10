import { Stack } from 'expo-router'
import React from 'react'

import { ReAuthBanner } from '@/components/re-auth-banner'
import { useLocalIdentity } from '@/lib/auth/local-identity-context'
import { PowerSyncProvider } from '@/lib/powersync'

export default function ProtectedLayout() {
  const { identity } = useLocalIdentity()

  if (!identity) return null

  return (
    <PowerSyncProvider userId={identity.userId}>
      <ReAuthBanner />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="re-auth" options={{ presentation: 'modal' }} />
      </Stack>
    </PowerSyncProvider>
  )
}
