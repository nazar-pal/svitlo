import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack, type StackScreenProps } from 'expo-router'
import React from 'react'

import { ModalCloseButton } from '@/components/navigation/modal-close-button'
import { ReAuthBanner } from '@/components/re-auth-banner'
import { useLocalIdentity } from '@/lib/auth/local-identity-context'
import { SelectedOrgProvider } from '@/lib/organization/use-selected-org'
import { PowerSyncProvider } from '@/lib/powersync'

const glassAvailable = isLiquidGlassAvailable()

const formSheetOptions = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  headerShown: true,
  ...(glassAvailable
    ? { headerTransparent: true }
    : { headerBlurEffect: 'systemMaterial' }),
  headerLeft: () => <ModalCloseButton />
} satisfies StackScreenProps['options']

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
              ...(glassAvailable
                ? { headerTransparent: true }
                : { headerBlurEffect: 'systemMaterial' }),
              title: 'Activity'
            }}
          />
          <Stack.Screen
            name="generator/create"
            options={{ ...formSheetOptions, title: 'New Generator' }}
          />
          <Stack.Screen
            name="generator/log-session"
            options={{
              ...formSheetOptions,
              title: 'Log Past Run'
            }}
          />
          <Stack.Screen
            name="maintenance/create-template"
            options={{ ...formSheetOptions, title: 'New Task' }}
          />
          <Stack.Screen
            name="maintenance/add-suggestions"
            options={{ ...formSheetOptions, title: 'AI Suggestions' }}
          />
          <Stack.Screen
            name="maintenance/record"
            options={{
              ...formSheetOptions,
              title: 'Record Maintenance'
            }}
          />
          <Stack.Screen
            name="activity/edit-session"
            options={{
              ...formSheetOptions,
              title: 'Edit Run'
            }}
          />
          <Stack.Screen
            name="activity/edit-maintenance"
            options={{
              ...formSheetOptions,
              title: 'Edit Maintenance'
            }}
          />
          <Stack.Screen
            name="organization/create"
            options={{
              ...formSheetOptions,
              title: 'New Organization'
            }}
          />
          <Stack.Screen
            name="organization/[id]/invite"
            options={{
              ...formSheetOptions,
              title: 'Invite Member'
            }}
          />
        </Stack>
      </SelectedOrgProvider>
    </PowerSyncProvider>
  )
}
