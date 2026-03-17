import { SymbolView } from 'expo-symbols'
import { PressableFeedback, Surface } from 'heroui-native'
import { Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import {
  formatMaintenanceLabel,
  type NextMaintenanceCardInfo
} from '@/lib/maintenance/due'

interface UpcomingMaintenanceItemProps {
  generatorTitle: string
  taskName: string
  info: NextMaintenanceCardInfo
  onPress: () => void
}

export function UpcomingMaintenanceItem({
  generatorTitle,
  taskName,
  info,
  onPress
}: UpcomingMaintenanceItemProps) {
  const mutedColor = useCSSVariable('--color-muted') as string | undefined
  const labelColor = info.urgency === 'due_soon' ? 'text-warning' : 'text-muted'

  return (
    <PressableFeedback onPress={onPress}>
      <Surface variant="secondary">
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
              {generatorTitle}
              {' · '}
              <Text className={labelColor}>{formatMaintenanceLabel(info)}</Text>
            </Text>
          </View>
          <SymbolView name="chevron.right" size={14} tintColor={mutedColor} />
        </View>
      </Surface>
    </PressableFeedback>
  )
}
