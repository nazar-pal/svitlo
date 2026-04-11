import '@azure/core-asynciterator-polyfill'
import * as SplashScreen from 'expo-splash-screen'
import { setBackgroundColorAsync } from 'expo-system-ui'
import '../global.css'
import '@/lib/hide-dev-fab'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import { UpdateChecker } from '@/components/update-checker'
import {
  AppReadinessProvider,
  ReadinessGate
} from '@/lib/app-readiness/context'
import { AuthGate } from '@/lib/auth/auth-gate'
import { LocalIdentityProvider } from '@/lib/auth/local-identity-context'
import { defaultSessionRuntime } from '@/lib/auth/session-runtime-default'
import { SessionRuntimeProvider } from '@/lib/auth/session-runtime'
import '@/lib/i18n'
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { HeroUINativeProvider, useThemeColor } from 'heroui-native'
import React, { useEffect } from 'react'
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
            <AppReadinessProvider>
              <AnimatedSplashOverlay />
              <UpdateChecker />
              <SessionRuntimeProvider runtime={defaultSessionRuntime}>
                <LocalIdentityProvider>
                  <ReadinessGate>
                    <AuthGate />
                  </ReadinessGate>
                </LocalIdentityProvider>
              </SessionRuntimeProvider>
            </AppReadinessProvider>
          </ThemeProvider>
        </HeroUINativeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
