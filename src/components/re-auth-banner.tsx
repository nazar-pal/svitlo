import { useQuery } from '@powersync/react-native'
import { useRouter } from 'expo-router'
import { Alert, Button } from 'heroui-native'
import { useState } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useSessionStatus } from '@/lib/auth/session-status-context'
import { useTranslation } from '@/lib/i18n'

function usePendingChangesCount(): number {
  const { data } = useQuery<{ count: number }>(
    'SELECT COUNT(*) as count FROM ps_crud'
  )
  return data[0]?.count ?? 0
}

export function ReAuthBanner() {
  const { t } = useTranslation()
  const { sessionStatus } = useSessionStatus()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const insets = useSafeAreaInsets()
  const pendingCount = usePendingChangesCount()

  if (sessionStatus !== 'expired' || dismissed) return null

  const message =
    pendingCount > 0
      ? t('sync.expiredWithChanges', { count: pendingCount })
      : t('sync.expiredNoChanges')

  return (
    <Alert
      status="warning"
      className="border-warning/20 rounded-none border-b"
      style={{ paddingTop: insets.top }}
    >
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
      <View className="flex-row gap-2">
        <Button
          size="sm"
          variant="primary"
          onPress={() => router.push('/(protected)/re-auth')}
        >
          {t('common.signIn')}
        </Button>
        {pendingCount === 0 ? (
          <Button size="sm" variant="ghost" onPress={() => setDismissed(true)}>
            {t('sync.dismiss')}
          </Button>
        ) : null}
      </View>
    </Alert>
  )
}
