import { useStatus } from '@powersync/react-native'
import { SymbolView } from 'expo-symbols'
import { Spinner, useThemeColor } from 'heroui-native'
import { Text, View } from 'react-native'

import { useSessionStatus } from '@/lib/auth/session-status-context'
import { useTranslation } from '@/lib/i18n'
import { useSyncRejections } from '@/lib/powersync/sync-rejections'

function useSyncState() {
  const { t } = useTranslation()
  const status = useStatus()
  const { sessionStatus } = useSessionStatus()
  const rejections = useSyncRejections()

  if (rejections.length > 0)
    return {
      label: t('sync.changesNotSynced', { count: rejections.length }),
      icon: 'exclamationmark.triangle.fill' as const,
      color: 'text-warning' as const,
      loading: false
    }

  if (
    status.dataFlowStatus?.uploadError ||
    status.dataFlowStatus?.downloadError
  )
    return {
      label: t('sync.syncError'),
      icon: 'exclamationmark.triangle.fill' as const,
      color: 'text-danger' as const,
      loading: false
    }

  if (status.dataFlowStatus?.uploading)
    return {
      label: t('sync.syncingChanges'),
      icon: null,
      color: 'text-muted' as const,
      loading: true
    }

  if (sessionStatus === 'expired' && !status.connected)
    return {
      label: t('sync.sessionExpired'),
      icon: 'exclamationmark.arrow.circlepath' as const,
      color: 'text-warning' as const,
      loading: false
    }

  if (!status.connected && !status.connecting)
    return {
      label: t('sync.offline'),
      icon: 'wifi.slash' as const,
      color: 'text-muted' as const,
      loading: false
    }

  if (status.connecting && !status.connected)
    return {
      label: t('sync.connecting'),
      icon: null,
      color: 'text-muted' as const,
      loading: true
    }

  return {
    label: t('sync.allSynced'),
    icon: 'checkmark.icloud.fill' as const,
    color: 'text-muted' as const,
    loading: false
  }
}

export function SyncStatusIndicator() {
  const { label, icon, color, loading } = useSyncState()
  const [mutedColor, warningColor, dangerColor] = useThemeColor([
    'muted',
    'warning',
    'danger'
  ])

  const iconTint =
    color === 'text-warning'
      ? warningColor
      : color === 'text-danger'
        ? dangerColor
        : mutedColor

  return (
    <View className="flex-row items-center gap-1.5">
      {loading ? (
        <Spinner size="sm" />
      ) : icon ? (
        <SymbolView name={icon} size={12} tintColor={iconTint} />
      ) : null}
      <Text className={`text-xs ${color}`}>{label}</Text>
    </View>
  )
}
