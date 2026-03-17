import React from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

export function AuthBootstrapScreen() {
  return (
    <View className="bg-background flex-1 items-center justify-center gap-4">
      <ActivityIndicator size="small" />
      <Text className="text-muted text-sm">Restoring your session...</Text>
    </View>
  )
}
