import { SymbolView } from 'expo-symbols'
import { PressableFeedback, Surface, useThemeColor } from 'heroui-native'
import { Text, View } from 'react-native'

import { formatHours } from '@/lib/utils/time'

interface OverdueMaintenanceItemProps {
  generatorTitle: string
  taskName: string
  hoursRemaining: number | null
  daysRemaining: number | null
  onPress: () => void
}

function formatOverdue(
  hoursRemaining: number | null,
  daysRemaining: number | null
): string {
  const overdueHours = hoursRemaining !== null ? -hoursRemaining : null
  const overdueDays = daysRemaining !== null ? -daysRemaining : null
  if (overdueHours !== null && overdueDays !== null)
    return overdueHours >= overdueDays * 24
      ? `${formatHours(overdueHours)} overdue`
      : `${Math.ceil(overdueDays)}d overdue`
  if (overdueHours !== null) return `${formatHours(overdueHours)} overdue`
  if (overdueDays !== null) return `${Math.ceil(overdueDays)}d overdue`
  return 'overdue'
}

export function OverdueMaintenanceItem({
  generatorTitle,
  taskName,
  hoursRemaining,
  daysRemaining,
  onPress
}: OverdueMaintenanceItemProps) {
  const [mutedColor, dangerColor] = useThemeColor(['muted', 'danger'])

  return (
    <PressableFeedback onPress={onPress}>
      <Surface variant="secondary">
        <View className="flex-row items-center gap-3">
          <View className="bg-danger/15 size-10 items-center justify-center rounded-xl">
            <SymbolView name="wrench.fill" size={20} tintColor={dangerColor} />
          </View>
          <View className="flex-1 gap-0.5">
            <Text
              className="text-foreground text-4.25 font-semibold"
              numberOfLines={1}
            >
              {taskName}
            </Text>
            <Text className="text-muted text-3.25" numberOfLines={1}>
              {generatorTitle}
              {' · '}
              <Text className="text-danger">
                {formatOverdue(hoursRemaining, daysRemaining)}
              </Text>
            </Text>
          </View>
          <SymbolView name="chevron.right" size={14} tintColor={mutedColor} />
        </View>
      </Surface>
    </PressableFeedback>
  )
}
