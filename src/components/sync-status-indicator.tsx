import { useStatus } from '@powersync/react-native'
import { SymbolView } from 'expo-symbols'
import { ActivityIndicator, Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

function useSyncState() {
  const status = useStatus()

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
  const mutedColor = useCSSVariable('--color-muted') as string | undefined

  return (
    <View className="flex-row items-center gap-1.5">
      {loading ? (
        <ActivityIndicator size={12} color={mutedColor} />
      ) : icon ? (
        <SymbolView name={icon} size={12} tintColor={mutedColor} />
      ) : null}
      <Text className={`text-xs ${color}`}>{label}</Text>
    </View>
  )
}
