import { Stack } from 'expo-router'
import React from 'react'

import { ReAuthBanner } from '@/components/re-auth-banner'
import { useLocalIdentity } from '@/lib/auth/local-identity-context'
import { SelectedOrgProvider } from '@/lib/hooks/use-selected-org'
import { PowerSyncProvider } from '@/lib/powersync'

export default function ProtectedLayout() {
  const { identity } = useLocalIdentity()

  if (!identity) return null

  return (
    <PowerSyncProvider userId={identity.userId}>
      <SelectedOrgProvider>
        <ReAuthBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(drawer)" />
          <Stack.Screen name="re-auth" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="generator/[id]"
            options={{
              headerShown: true,
              headerLargeTitle: true,
              headerLargeTitleShadowVisible: false,
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal'
            }}
          />
          <Stack.Screen
            name="generator/activity"
            options={{
              presentation: 'formSheet',
              sheetGrabberVisible: true,
              sheetAllowedDetents: [0.5, 1.0],
              sheetExpandsWhenScrolledToEdge: true,
              headerShown: true,
              title: 'Activity'
            }}
          />
          <Stack.Screen
            name="generator/create"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="maintenance/create-template"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="maintenance/record"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="organization/create"
            options={{ presentation: 'modal' }}
          />
          <Stack.Screen
            name="organization/[id]/invite"
            options={{ presentation: 'modal' }}
          />
        </Stack>
      </SelectedOrgProvider>
    </PowerSyncProvider>
  )
}
