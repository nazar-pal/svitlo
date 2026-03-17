import { useStatus } from '@powersync/react-native'
import { SymbolView } from 'expo-symbols'
import { Spinner } from 'heroui-native'
import { Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import { useSyncRejections } from '@/lib/powersync/sync-rejections'

function useSyncState() {
  const status = useStatus()
  const rejections = useSyncRejections()

  if (rejections.length > 0)
    return {
      label: `${rejections.length} change${rejections.length === 1 ? '' : 's'} could not be synced`,
      icon: 'exclamationmark.triangle.fill' as const,
      color: 'text-warning' as const,
      loading: false
    }

  if (
    status.dataFlowStatus?.uploadError ||
    status.dataFlowStatus?.downloadError
  )
    return {
      label: 'Sync error',
      icon: 'exclamationmark.triangle.fill' as const,
      color: 'text-danger' as const,
      loading: false
    }

  if (status.dataFlowStatus?.uploading)
    return {
      label: 'Syncing changes…',
      icon: null,
      color: 'text-muted' as const,
      loading: true
    }

  if (!status.connected && !status.connecting)
    return {
      label: 'Offline — changes saved locally',
      icon: 'wifi.slash' as const,
      color: 'text-muted' as const,
      loading: false
    }

  if (status.connecting && !status.connected)
    return {
      label: 'Connecting…',
      icon: null,
      color: 'text-muted' as const,
      loading: true
    }

  return {
    label: 'All changes synced',
    icon: 'checkmark.icloud.fill' as const,
    color: 'text-muted' as const,
    loading: false
  }
}

export function SyncStatusIndicator() {
  const { label, icon, color, loading } = useSyncState()
  const [mutedColor, warningColor] = useCSSVariable([
    '--color-muted',
    '--color-warning'
  ]) as string[]

  const iconTint = color === 'text-warning' ? warningColor : mutedColor

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
