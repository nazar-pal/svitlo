import { useStatus } from '@powersync/react-native'
import { SymbolView } from 'expo-symbols'
import { Spinner, useThemeColor } from 'heroui-native'
import { Text, View } from 'react-native'

import { useAuthSession } from '@/lib/auth/session'
import { useTranslation } from '@/lib/i18n'
import { useSyncRejections } from '@/lib/powersync/sync-outbox-context'

import { type SyncStateKey, deriveSyncState } from './derive-sync-state'

const stateDisplay = {
  changesNotSynced: {
    labelKey: 'sync.changesNotSynced' as const,
    icon: 'exclamationmark.triangle.fill' as const,
    color: 'text-warning' as const
  },
  syncError: {
    labelKey: 'sync.syncError' as const,
    icon: 'exclamationmark.triangle.fill' as const,
    color: 'text-danger' as const
  },
  syncingChanges: {
    labelKey: 'sync.syncingChanges' as const,
    icon: null,
    color: 'text-muted' as const
  },
  sessionExpired: {
    labelKey: 'sync.sessionExpired' as const,
    icon: 'exclamationmark.arrow.circlepath' as const,
    color: 'text-warning' as const
  },
  offline: {
    labelKey: 'sync.offline' as const,
    icon: 'wifi.slash' as const,
    color: 'text-muted' as const
  },
  connecting: {
    labelKey: 'sync.connecting' as const,
    icon: null,
    color: 'text-muted' as const
  },
  allSynced: {
    labelKey: 'sync.allSynced' as const,
    icon: 'checkmark.icloud.fill' as const,
    color: 'text-muted' as const
  }
} satisfies Record<
  SyncStateKey,
  { labelKey: string; icon: string | null; color: string }
>

function useSyncState() {
  const { t } = useTranslation()
  const status = useStatus()
  const { status: sessionStatus } = useAuthSession()
  const rejections = useSyncRejections()

  const { key, loading } = deriveSyncState({
    connected: status.connected,
    connecting: status.connecting,
    uploading: status.dataFlowStatus?.uploading ?? false,
    uploadError: status.dataFlowStatus?.uploadError ?? null,
    downloadError: status.dataFlowStatus?.downloadError ?? null,
    sessionStatus,
    rejectionsCount: rejections.length
  })

  const display = stateDisplay[key]
  const label =
    key === 'changesNotSynced'
      ? t(display.labelKey, { count: rejections.length })
      : t(display.labelKey)

  return { label, icon: display.icon, color: display.color, loading }
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
