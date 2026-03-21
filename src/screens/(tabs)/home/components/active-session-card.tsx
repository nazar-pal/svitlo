import { SymbolView } from 'expo-symbols'
import { Button, Surface, useThemeColor } from 'heroui-native'
import { Alert, Text, View } from 'react-native'

import { SkiaProgressBar } from '@/components/skia-progress-bar'
import type { Generator, GeneratorSession } from '@/data/client/db-schema'
import { useTranslation } from '@/lib/i18n'
import { notifySuccess } from '@/lib/haptics'
import { stopSession } from '@/data/client/mutations'
import { computeGeneratorStatus } from '@/lib/generator/status'
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
  const { t } = useTranslation()
  const successColor = useThemeColor('success')
  const { consecutiveRunHours } = computeGeneratorStatus(generator, sessions)
  const elapsedHours = useElapsedHours(session.startedAt)
  const elapsedTimeStr = useElapsedTime(session.startedAt)

  const totalRunHours = consecutiveRunHours + elapsedHours
  const maxHours = generator.maxConsecutiveRunHours
  const progress = Math.min(totalRunHours / maxHours, 1)
  const warningFraction = generator.runWarningThresholdPct / 100

  async function handleStop() {
    const result = await stopSession(userId, session.id)
    if (!result.ok) return Alert.alert(t('common.error'), result.error)
    notifySuccess()
  }

  return (
    <Surface variant="secondary" className="gap-4">
      <View className="flex-row items-center gap-2">
        <View className="bg-success/15 size-7 items-center justify-center rounded-lg">
          <SymbolView name="bolt.fill" size={14} tintColor={successColor} />
        </View>
        <Text className="text-success text-xs font-semibold tracking-wide uppercase">
          {t('home.myActiveSession')}
        </Text>
      </View>

      <View className="gap-1">
        <Text
          className="text-foreground text-5.5 leading-tight font-bold"
          numberOfLines={1}
        >
          {generator.title}
        </Text>
        <Text
          className="text-success text-13 leading-none font-semibold"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {elapsedTimeStr}
        </Text>
      </View>

      <View className="gap-1.5">
        <View className="bg-default h-2 overflow-hidden rounded-full">
          <SkiaProgressBar
            progress={progress}
            warningFraction={warningFraction}
            height={8}
          />
        </View>
        <View className="flex-row justify-between">
          <Text className="text-muted text-3">
            {t('generator.elapsed', { hours: formatHours(totalRunHours) })}
          </Text>
          <Text className="text-muted text-3">
            {t('generator.max', { hours: formatHours(maxHours) })}
          </Text>
        </View>
      </View>

      <Button variant="danger" size="lg" onPress={handleStop}>
        {t('home.stopGenerator')}
      </Button>
    </Surface>
  )
}
