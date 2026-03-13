import { SymbolView } from 'expo-symbols'
import { Pressable, Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import type { NextMaintenanceCardInfo } from '@/lib/hooks/use-maintenance-due'

import { formatUpcoming } from '../helpers'

interface UpcomingMaintenanceItemProps {
  generatorName: string
  taskName: string
  info: NextMaintenanceCardInfo
  onPress: () => void
}

export function UpcomingMaintenanceItem({
  generatorName,
  taskName,
  info,
  onPress
}: UpcomingMaintenanceItemProps) {
  const mutedColor = useCSSVariable('--color-muted') as string | undefined
  const labelColor =
    info.urgency === 'due_soon' ? 'text-orange-500' : 'text-muted'

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-secondary rounded-2xl px-4 py-3.5 active:opacity-80"
    >
      <View className="flex-row items-center gap-3">
        <View className="bg-default size-10 items-center justify-center rounded-xl">
          <SymbolView name="wrench.fill" size={20} tintColor={mutedColor} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text
            className="text-foreground text-[17px] font-semibold"
            numberOfLines={1}
          >
            {taskName}
          </Text>
          <Text className="text-muted text-[13px]" numberOfLines={1}>
            {generatorName}
            {' · '}
            <Text className={labelColor}>{formatUpcoming(info)}</Text>
          </Text>
        </View>
        <SymbolView name="chevron.right" size={14} tintColor={mutedColor} />
      </View>
    </Pressable>
  )
}
