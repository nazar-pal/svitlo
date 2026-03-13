import '../global.css'

import { Stack } from 'expo-router'
import React from 'react'

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(public)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  )
}
