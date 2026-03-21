import { Stack } from 'expo-router'
import { View } from 'react-native'

import { WebLocalePicker } from '@/components/web-locale-picker'

export default function WebLayout() {
  return (
    <View className="flex-1">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="privacy-policy" />
      </Stack>
      <WebLocalePicker />
    </View>
  )
}
