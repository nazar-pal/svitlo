import { useQuery } from '@powersync/react-native'
import { useRouter } from 'expo-router'
import { Button } from 'heroui-native'
import React, { useState } from 'react'
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useSessionStatus } from '@/lib/auth/session-status-context'

function usePendingChangesCount(): number {
  const { data } = useQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM ps_crud'
  )
  return data[0]?.count ?? 0
}

export function ReAuthBanner() {
  const { sessionStatus } = useSessionStatus()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const insets = useSafeAreaInsets()
  const pendingCount = usePendingChangesCount()

  if (sessionStatus !== 'expired' || dismissed) return null

  const message =
    pendingCount > 0
      ? `Session expired — ${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting to sync. Your data is safe.`
      : 'Session expired — sign in to resume syncing.'

  return (
    <View
      className="bg-warning/10 border-warning/20 flex-row items-center gap-3 border-b px-4 py-3"
      style={{ paddingTop: insets.top }}
    >
      <Text className="text-foreground flex-1 text-sm leading-5">
        {message}
      </Text>
      <Button
        size="sm"
        variant="primary"
        onPress={() => router.push('/(protected)/re-auth')}
      >
        Sign in
      </Button>
      {pendingCount === 0 && (
        <Button size="sm" variant="ghost" onPress={() => setDismissed(true)}>
          Dismiss
        </Button>
      )}
    </View>
  )
}
