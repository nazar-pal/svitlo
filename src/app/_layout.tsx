import '@azure/core-asynciterator-polyfill'
import '../global.css'

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from '@react-navigation/native'
import { QueryClientProvider } from '@tanstack/react-query'
import { HeroUINativeProvider } from 'heroui-native'
import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useUniwind } from 'uniwind'

import { AnimatedSplashOverlay } from '@/components/animated-icon'
import { AuthGate } from '@/components/auth-gate'
import { queryClient } from '@/data/trpc/query-client'
import { LocalIdentityProvider } from '@/lib/auth/local-identity-context'

export default function RootLayout() {
  const { theme } = useUniwind()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
            <AnimatedSplashOverlay />
            <LocalIdentityProvider>
              <AuthGate />
            </LocalIdentityProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  )
}
