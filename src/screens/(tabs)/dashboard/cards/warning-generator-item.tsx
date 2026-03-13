import { SymbolView } from 'expo-symbols'
import { Pressable, Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import type { Generator, GeneratorSession } from '@/data/client/db-schema'
import { useElapsedHours, formatHours } from '@/lib/hooks/use-elapsed-time'
import { computeGeneratorStatus } from '@/lib/hooks/use-generator-status'

interface WarningGeneratorItemProps {
  generator: Generator
  sessions: GeneratorSession[]
  startedByName: string
  onPress: () => void
}

export function WarningGeneratorItem({
  generator,
  sessions,
  startedByName,
  onPress
}: WarningGeneratorItemProps) {
  const mutedColor = useCSSVariable('--color-muted') as string | undefined
  const { openSession, consecutiveRunHours } = computeGeneratorStatus(
    generator,
    sessions
  )
  const elapsedHours = useElapsedHours(openSession?.startedAt ?? null)
  const totalRunHours = consecutiveRunHours + elapsedHours
  const maxHours = generator.maxConsecutiveRunHours
  const progress = Math.min(totalRunHours / maxHours, 1)
  const progressColor = progress >= 1 ? 'bg-red-500' : 'bg-orange-500'

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-secondary rounded-2xl px-4 py-3.5 active:opacity-80"
    >
      <View className="flex-row items-center gap-3">
        <View className="size-10 items-center justify-center rounded-xl bg-orange-500/15">
          <SymbolView
            name="exclamationmark.triangle.fill"
            size={20}
            tintColor="#f97316"
          />
        </View>
        <View className="flex-1 gap-0.5">
          <Text
            className="text-foreground text-[17px] font-semibold"
            numberOfLines={1}
          >
            {generator.name}
          </Text>
          <Text className="text-muted text-[13px]">
            Started by {startedByName}
          </Text>
        </View>
        <SymbolView name="chevron.right" size={14} tintColor={mutedColor} />
      </View>
      <View className="mt-3 gap-1.5">
        <View className="bg-default h-1.5 overflow-hidden rounded-full">
          <View
            className={`h-full rounded-full ${progressColor}`}
            style={{ width: `${progress * 100}%` }}
          />
        </View>
        <View className="flex-row justify-between">
          <Text className="text-muted text-[12px]">
            {formatHours(totalRunHours)} elapsed
          </Text>
          <Text className="text-[12px] font-medium text-orange-500">
            {Math.round(progress * 100)}% of {formatHours(maxHours)}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}
