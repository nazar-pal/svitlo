import { SymbolView } from 'expo-symbols'
import { Pressable, Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import { formatHours } from '@/lib/hooks/use-elapsed-time'

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
  const mutedColor = useCSSVariable('--color-muted') as string | undefined

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-secondary rounded-2xl px-4 py-3.5 active:opacity-80"
    >
      <View className="flex-row items-center gap-3">
        <View className="size-10 items-center justify-center rounded-xl bg-red-500/15">
          <SymbolView name="wrench.fill" size={20} tintColor="#ef4444" />
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
            <Text className="text-red-500">
              {formatOverdue(hoursRemaining, daysRemaining)}
            </Text>
          </Text>
        </View>
        <SymbolView name="chevron.right" size={14} tintColor={mutedColor} />
      </View>
    </Pressable>
  )
}
