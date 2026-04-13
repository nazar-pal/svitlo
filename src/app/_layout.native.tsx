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
import { AuthSessionProvider, useAuthSession } from '@/lib/auth/session'
import { defaultSessionRuntime } from '@/lib/auth/session-runtime-default'
import { SessionRuntimeProvider } from '@/lib/auth/session-runtime'
import { powersync } from '@/lib/powersync/database'
import { createSyncOutbox } from '@/lib/powersync/sync-outbox'
import { SyncOutboxProvider } from '@/lib/powersync/sync-outbox-context'
import '@/lib/i18n'
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { HeroUINativeProvider, useThemeColor } from 'heroui-native'
import React, { useEffect, useRef, useState } from 'react'
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
                <AuthSessionProvider>
                  <StartupCoordinatorBridge>
                    <AnimatedSplashOverlay />
                    <UpdateChecker />
                    <AuthGate />
                  </StartupCoordinatorBridge>
                </AuthSessionProvider>
              </SessionRuntimeProvider>
            </NativePowerSyncContext.Provider>
          </ThemeProvider>
        </HeroUINativeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}

// Bridge ties the default runtime's onAuthExpired callback to the
// AuthSession reducer. The runtime is built once via useState's lazy
// initializer — it closes over module-scoped PowerSync state
// (listener-registered, connected flags), so a new instance per render
// would double-register listeners and break connect idempotency. The
// markExpired wrapper is re-created on each state change, so route the
// callback through a ref so the captured closure keeps firing the latest
// dispatch for the component's lifetime.
function StartupCoordinatorBridge({ children }: { children: React.ReactNode }) {
  const { markExpired } = useAuthSession()
  const markExpiredRef = useRef(markExpired)
  markExpiredRef.current = markExpired
  const [{ runtime, outbox }] = useState(() => {
    const outbox = createSyncOutbox()
    const runtime = createDefaultPowerSyncRuntime({
      onAuthExpired: () => markExpiredRef.current(),
      outbox
    })
    return { runtime, outbox }
  })
  return (
    <SyncOutboxProvider outbox={outbox}>
      <StartupCoordinator runtime={runtime}>{children}</StartupCoordinator>
    </SyncOutboxProvider>
  )
}
