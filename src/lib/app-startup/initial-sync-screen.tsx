import { Button } from 'heroui-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Text, View } from 'react-native'

import { useAuthSession } from '@/lib/auth/session'

interface InitialSyncScreenProps {
  progress: { downloadedFraction: number } | null
}

// First-sync has no hard deadline of its own (unlike db-init), so hold the
// emergency escape hatch back for 15 seconds to avoid scaring new users on
// a normal first-launch download.
const EMERGENCY_SIGN_OUT_DELAY_MS = 15_000

export function InitialSyncScreen({ progress }: InitialSyncScreenProps) {
  const { emergencySignOut } = useAuthSession()
  const [showEmergencySignOut, setShowEmergencySignOut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(
      () => setShowEmergencySignOut(true),
      EMERGENCY_SIGN_OUT_DELAY_MS
    )
    return () => clearTimeout(timer)
  }, [])

  const percentage = progress
    ? Math.round(progress.downloadedFraction * 100)
    : null

  return (
    <View className="bg-background flex-1 items-center justify-center gap-4 px-8">
      <ActivityIndicator size="small" />
      <Text className="text-muted text-sm">
        {percentage !== null
          ? `Syncing your data… ${percentage}%`
          : 'Syncing your data…'}
      </Text>
      {showEmergencySignOut ? (
        <View className="mt-6 items-center gap-2">
          <Text className="text-muted text-center text-xs">
            Taking longer than expected?
          </Text>
          <Button variant="ghost" size="sm" onPress={emergencySignOut}>
            Sign Out
          </Button>
        </View>
      ) : null}
    </View>
  )
}
