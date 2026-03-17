import { SymbolView } from 'expo-symbols'
import { Button } from 'heroui-native'
import { Alert, Text, View } from 'react-native'

import type { Generator, GeneratorSession } from '@/data/client/db-schema'
import { stopSession } from '@/data/client/mutations'
import { computeGeneratorStatus, progressColor } from '@/lib/generator/status'
import {
  useElapsedHours,
  useElapsedTime
} from '@/lib/generator/use-elapsed-time'
import { formatHours } from '@/lib/utils/time'

interface ActiveSessionCardProps {
  generator: Generator
  session: GeneratorSession
  sessions: GeneratorSession[]
  userId: string
}

export function ActiveSessionCard({
  generator,
  session,
  sessions,
  userId
}: ActiveSessionCardProps) {
  const { consecutiveRunHours } = computeGeneratorStatus(generator, sessions)
  const elapsedHours = useElapsedHours(session.startedAt)
  const elapsedTimeStr = useElapsedTime(session.startedAt)

  const totalRunHours = consecutiveRunHours + elapsedHours
  const maxHours = generator.maxConsecutiveRunHours
  const progress = Math.min(totalRunHours / maxHours, 1)
  const warningFraction = generator.runWarningThresholdPct / 100
  const barColor = progressColor(progress, warningFraction)

  async function handleStop() {
    const result = await stopSession(userId, session.id)
    if (!result.ok) Alert.alert('Error', result.error)
  }

  return (
    <View className="bg-surface-secondary gap-4 rounded-2xl px-4 pt-3.5 pb-4">
      <View className="flex-row items-center gap-2">
        <View className="size-7 items-center justify-center rounded-lg bg-green-500/15">
          <SymbolView name="bolt.fill" size={14} tintColor="#22c55e" />
        </View>
        <Text className="text-xs font-semibold tracking-wide text-green-600 uppercase">
          My Active Session
        </Text>
      </View>

      <View className="gap-1">
        <Text
          className="text-foreground text-[22px] leading-tight font-bold"
          numberOfLines={1}
        >
          {generator.title}
        </Text>
        <Text
          className="text-[52px] leading-none font-semibold text-green-600"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {elapsedTimeStr}
        </Text>
      </View>

      <View className="gap-1.5">
        <View className="bg-default h-2 overflow-hidden rounded-full">
          <View
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${progress * 100}%` }}
          />
        </View>
        <View className="flex-row justify-between">
          <Text className="text-muted text-[12px]">
            {formatHours(totalRunHours)} elapsed
          </Text>
          <Text className="text-muted text-[12px]">
            {formatHours(maxHours)} max
          </Text>
        </View>
      </View>

      <Button variant="danger" size="lg" onPress={handleStop}>
        Stop Generator
      </Button>
    </View>
  )
}
