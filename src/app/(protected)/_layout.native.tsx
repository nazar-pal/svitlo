import { isLiquidGlassAvailable } from 'expo-glass-effect'
import { Stack, type StackScreenProps } from 'expo-router'
import React from 'react'

import { ModalCloseButton } from '@/components/navigation/modal-close-button'
import { ReAuthBanner } from '@/components/re-auth-banner'
import { useLocalIdentity } from '@/lib/auth/local-identity-context'
import { useTranslation } from '@/lib/i18n'
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

const compactSheetOptions = {
  ...formSheetOptions,
  sheetAllowedDetents: [0.5, 1.0],
  sheetExpandsWhenScrolledToEdge: true
} satisfies StackScreenProps['options']

const halfSheetOptions = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.5, 1.0],
  sheetExpandsWhenScrolledToEdge: true,
  headerShown: true,
  ...(glassAvailable
    ? { headerTransparent: true }
    : { headerBlurEffect: 'systemMaterial' })
} satisfies StackScreenProps['options']

export default function ProtectedLayout() {
  const { identity } = useLocalIdentity()
  const { t } = useTranslation()

  if (!identity) return null

  return (
    <PowerSyncProvider userId={identity.userId}>
      <SelectedOrgProvider>
        <ReAuthBanner />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(drawer)" />
          <Stack.Screen name="re-auth" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="generator/activity"
            options={{ ...halfSheetOptions, title: t('tabs.activity') }}
          />
          <Stack.Screen
            name="generator/maintenance"
            options={{ ...halfSheetOptions, title: t('tabs.maintenance') }}
          />
          <Stack.Screen
            name="generator/create"
            options={{
              ...formSheetOptions,
              title: t('generator.newGenerator')
            }}
          />
          <Stack.Screen
            name="generator/log-session"
            options={{
              ...formSheetOptions,
              title: t('screens.logPastRun')
            }}
          />
          <Stack.Screen
            name="generator/settings"
            options={{
              ...formSheetOptions,
              title: t('generator.settings')
            }}
          />
          <Stack.Screen
            name="maintenance/create-template"
            options={{ ...formSheetOptions, title: t('screens.newTask') }}
          />
          <Stack.Screen
            name="maintenance/add-suggestions"
            options={{
              ...formSheetOptions,
              title: t('aiSuggestions.title')
            }}
          />
          <Stack.Screen
            name="maintenance/record"
            options={{
              ...compactSheetOptions,
              title: t('screens.recordMaintenance')
            }}
          />
          <Stack.Screen
            name="activity/edit-session"
            options={{
              ...formSheetOptions,
              title: t('screens.editRun')
            }}
          />
          <Stack.Screen
            name="activity/edit-maintenance"
            options={{
              ...formSheetOptions,
              title: t('screens.editMaintenance')
            }}
          />
          <Stack.Screen
            name="organization/create"
            options={{
              ...compactSheetOptions,
              title: t('screens.newOrganization')
            }}
          />
          <Stack.Screen
            name="organization/[id]/invite"
            options={{
              ...compactSheetOptions,
              title: t('screens.inviteMember')
            }}
          />
          <Stack.Screen
            name="organization/[id]/rename"
            options={{
              ...compactSheetOptions,
              title: t('screens.renameOrganization')
            }}
          />
        </Stack>
      </SelectedOrgProvider>
    </PowerSyncProvider>
  )
}
