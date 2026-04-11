import '@azure/core-asynciterator-polyfill'
import * as SplashScreen from 'expo-splash-screen'
import { setBackgroundColorAsync } from 'expo-system-ui'
import '../global.css'
import '@/lib/hide-dev-fab'

import { PowerSyncContext as NativePowerSyncContext } from '@powersync/react-native'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import { UpdateChecker } from '@/components/update-checker'
import { createDefaultPowerSyncRuntime } from '@/lib/app-startup/runtime'
import { StartupCoordinator } from '@/lib/app-startup/coordinator'
import { AuthGate } from '@/lib/auth/auth-gate'
import { LocalIdentityProvider } from '@/lib/auth/local-identity-context'
import { defaultSessionRuntime } from '@/lib/auth/session-runtime-default'
import { SessionRuntimeProvider } from '@/lib/auth/session-runtime'
import {
  SessionStatusProvider,
  useSessionStatus
} from '@/lib/auth/session-status-context'
import { powersync } from '@/lib/powersync/database'
import '@/lib/i18n'
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { HeroUINativeProvider, useThemeColor } from 'heroui-native'
import React, { useEffect, useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { useUniwind } from 'uniwind'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const { theme } = useUniwind()

  // Keep the root view background color in sync with the current theme
  const tabBarBackgroundColor = useThemeColor('background')
  useEffect(() => {
    setBackgroundColorAsync(tabBarBackgroundColor)
  }, [theme, tabBarBackgroundColor])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <HeroUINativeProvider>
          <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
            <NativePowerSyncContext.Provider value={powersync}>
              <SessionRuntimeProvider runtime={defaultSessionRuntime}>
                <LocalIdentityProvider>
                  <SessionStatusProvider>
                    <StartupCoordinatorBridge>
                      <AnimatedSplashOverlay />
                      <UpdateChecker />
                      <AuthGate />
                    </StartupCoordinatorBridge>
                  </SessionStatusProvider>
                </LocalIdentityProvider>
              </SessionRuntimeProvider>
            </NativePowerSyncContext.Provider>
          </ThemeProvider>
        </HeroUINativeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}

// Bridge ties the default runtime's onAuthExpired to the session-status
// context. Must mount inside SessionStatusProvider to call useSessionStatus.
// The runtime is built once via useState's lazy initializer — it closes over
// module-scoped PowerSync state (listener-registered, connected flags), so a
// new instance per render would double-register listeners and break connect
// idempotency. setSessionStatus is ref-stable, so the captured closure stays
// valid for the component's lifetime.
function StartupCoordinatorBridge({ children }: { children: React.ReactNode }) {
  const { setSessionStatus } = useSessionStatus()
  const [runtime] = useState(() =>
    createDefaultPowerSyncRuntime({
      onAuthExpired: () => setSessionStatus('expired')
    })
  )
  return <StartupCoordinator runtime={runtime}>{children}</StartupCoordinator>
}
