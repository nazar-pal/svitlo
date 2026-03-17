import '@azure/core-asynciterator-polyfill'
import { setBackgroundColorAsync } from 'expo-system-ui'
import '../global.css'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import { AuthGate } from '@/lib/auth/auth-gate'
import { LocalIdentityProvider } from '@/lib/auth/local-identity-context'
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { HeroUINativeProvider } from 'heroui-native'
import React, { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { useCSSVariable, useUniwind } from 'uniwind'

export default function RootLayout() {
  const { theme } = useUniwind()

  // Keep the root view background color in sync with the current theme
  const tabBarBackgroundColor = useCSSVariable('--color-background') as string
  useEffect(() => {
    setBackgroundColorAsync(tabBarBackgroundColor)
  }, [theme, tabBarBackgroundColor])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <HeroUINativeProvider>
          <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
            <AnimatedSplashOverlay />
            <LocalIdentityProvider>
              <AuthGate />
            </LocalIdentityProvider>
          </ThemeProvider>
        </HeroUINativeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  )
}
