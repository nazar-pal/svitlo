import { SymbolView } from 'expo-symbols'
import { PressableFeedback, Surface, useThemeColor } from 'heroui-native'
import { Text, View } from 'react-native'

import { SkiaProgressBar } from '@/components/skia-progress-bar'
import type { Generator, GeneratorSession } from '@/data/client/db-schema'
import { computeGeneratorStatus } from '@/lib/generator/status'
import { useElapsedHours } from '@/lib/generator/use-elapsed-time'
import { formatHours } from '@/lib/utils/time'

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
  const [mutedColor, warningColor] = useThemeColor(['muted', 'warning'])
  const { openSession, consecutiveRunHours } = computeGeneratorStatus(
    generator,
    sessions
  )
  const elapsedHours = useElapsedHours(openSession?.startedAt ?? null)
  const totalRunHours = consecutiveRunHours + elapsedHours
  const maxHours = generator.maxConsecutiveRunHours
  const progress = Math.min(totalRunHours / maxHours, 1)

  return (
    <PressableFeedback onPress={onPress}>
      <Surface variant="secondary">
        <View className="flex-row items-center gap-3">
          <View className="bg-warning/15 size-10 items-center justify-center rounded-xl">
            <SymbolView
              name="exclamationmark.triangle.fill"
              size={20}
              tintColor={warningColor}
            />
          </View>
          <View className="flex-1 gap-0.5">
            <Text
              className="text-foreground text-4.25 font-semibold"
              numberOfLines={1}
            >
              {generator.title}
            </Text>
            <Text className="text-muted text-3.25">
              Started by {startedByName}
            </Text>
          </View>
          <SymbolView name="chevron.right" size={14} tintColor={mutedColor} />
        </View>
        <View className="mt-3 gap-1.5">
          <View className="bg-default h-1.5 overflow-hidden rounded-full">
            <SkiaProgressBar
              progress={progress}
              warningFraction={0}
              height={6}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted text-3">
              {formatHours(totalRunHours)} elapsed
            </Text>
            <Text className="text-warning text-3 font-medium">
              {Math.round(progress * 100)}% of {formatHours(maxHours)}
            </Text>
          </View>
        </View>
      </Surface>
    </PressableFeedback>
  )
}
