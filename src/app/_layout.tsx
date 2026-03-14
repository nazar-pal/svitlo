import '../global.css'

import { Stack } from 'expo-router'
import { HeroUINativeProvider } from 'heroui-native'
import React from 'react'

export default function RootLayout() {
  return (
    <HeroUINativeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(public)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </HeroUINativeProvider>
  )
}
