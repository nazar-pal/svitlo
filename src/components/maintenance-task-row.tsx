import { format, parseISO } from 'date-fns'
import { SymbolView } from 'expo-symbols'
import { Pressable, Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import type { MaintenanceDueInfo } from '@/lib/hooks/use-maintenance-due'

const URGENCY_CONFIG = {
  overdue: {
    label: 'Overdue',
    bg: 'bg-red-500/15',
    text: 'text-red-600',
    icon: 'exclamationmark.circle.fill'
  },
  due_soon: {
    label: 'Due Soon',
    bg: 'bg-orange-500/15',
    text: 'text-orange-600',
    icon: 'clock.fill'
  },
  ok: {
    label: 'OK',
    bg: 'bg-green-500/15',
    text: 'text-green-600',
    icon: 'checkmark.circle.fill'
  }
} as const

interface MaintenanceTaskRowProps {
  taskName: string
  generatorTitle: string
  dueInfo: MaintenanceDueInfo
  onPress: () => void
}

export function MaintenanceTaskRow({
  taskName,
  generatorTitle,
  dueInfo,
  onPress
}: MaintenanceTaskRowProps) {
  const foregroundColor = useCSSVariable('--color-foreground') as
    | string
    | undefined
  const config = URGENCY_CONFIG[dueInfo.urgency]

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-secondary flex-row items-center gap-3 rounded-2xl px-4 py-3.5 active:opacity-80"
    >
      <View className="flex-1 gap-1">
        <Text
          className="text-foreground text-[17px] font-semibold"
          numberOfLines={1}
        >
          {taskName}
        </Text>
        <Text className="text-muted text-[13px]">{generatorTitle}</Text>
        {dueInfo.lastPerformedAt ? (
          <Text className="text-muted text-[12px]">
            Last: {format(parseISO(dueInfo.lastPerformedAt), 'PP')}
          </Text>
        ) : null}
      </View>

      <View className="flex-row items-center gap-2">
        <View className={`rounded-full px-2.5 py-0.5 ${config.bg}`}>
          <Text className={`text-xs font-semibold ${config.text}`}>
            {config.label}
          </Text>
        </View>
        <SymbolView
          name="chevron.right"
          size={14}
          tintColor={foregroundColor}
        />
      </View>
    </Pressable>
  )
}
