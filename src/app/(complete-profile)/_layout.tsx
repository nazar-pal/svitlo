import { Stack } from 'expo-router'
import React from 'react'

export default function CompleteProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="complete-name" />
    </Stack>
  )
}
