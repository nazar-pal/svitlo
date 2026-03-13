import { useRouter } from 'expo-router'
import { Button } from 'heroui-native'
import React, { useState } from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useSessionStatus } from '@/lib/auth/session-status-context'

export function ReAuthBanner() {
  const { sessionStatus } = useSessionStatus()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const insets = useSafeAreaInsets()

  if (sessionStatus !== 'expired' || dismissed) return null

  return (
    <View
      className="bg-warning/10 border-warning/20 flex-row items-center gap-3 border-b px-4 py-3"
      style={{ paddingTop: insets.top }}
    >
      <Text className="text-foreground flex-1 text-sm leading-5">
        Session expired — sign in to sync your data.
      </Text>
      <Button
        size="sm"
        variant="primary"
        onPress={() => router.push('/(protected)/re-auth')}
      >
        Sign in
      </Button>
      <Button size="sm" variant="ghost" onPress={() => setDismissed(true)}>
        Dismiss
      </Button>
    </View>
  )
}
