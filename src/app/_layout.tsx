import '../global.css'

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider
} from '@react-navigation/native'
import { Stack } from 'expo-router'
import { HeroUINativeProvider } from 'heroui-native'
import React from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useUniwind } from 'uniwind'

import { AnimatedSplashOverlay } from '@/components/animated-icon'

export default function TabLayout() {
  const { theme } = useUniwind()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <ThemeProvider value={theme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="privacy-policy" />
          </Stack>
        </ThemeProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  )
}
