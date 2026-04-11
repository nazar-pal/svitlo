import { Button } from 'heroui-native'
import React from 'react'
import { Text, View } from 'react-native'

import { useAuthSession } from '@/lib/auth/session'

interface StartupErrorScreenProps {
  message: string | undefined
  onRetry: () => void
}

export function StartupErrorScreen({
  message,
  onRetry
}: StartupErrorScreenProps) {
  const { emergencySignOut } = useAuthSession()

  return (
    <View className="bg-background flex-1 items-center justify-center gap-4 px-8">
      <Text className="text-foreground text-lg font-semibold">
        Something went wrong
      </Text>
      <Text className="text-muted text-center text-sm">
        {message ?? 'Unable to open your local database.'}
      </Text>
      <View className="mt-4 w-full gap-2">
        <Button onPress={onRetry}>Try Again</Button>
        <Button variant="ghost" onPress={emergencySignOut}>
          Emergency Sign Out
        </Button>
      </View>
    </View>
  )
}
