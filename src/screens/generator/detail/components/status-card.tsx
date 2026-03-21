import { Text, View } from 'react-native'
import { Button } from 'heroui-native'

import { SkiaProgressBar } from '@/components/skia-progress-bar'

import { confirmRestingStart } from '@/lib/generator/confirm-resting-start'
import type { RestCountdown } from '@/lib/generator/use-rest-countdown'
import { useTranslation } from '@/lib/i18n'
import { formatHours } from '@/lib/utils/time'

interface AvailableStatusCardProps {
  status: 'available'
  onStart: () => void
}

interface RunningStatusCardProps {
  status: 'running'
  elapsedTime: string
  elapsedHours: number
  consecutiveRunHours: number
  maxConsecutiveRunHours: number
  warningThresholdPct: number
  onStop: () => void
}

interface RestingStatusCardProps {
  status: 'resting'
  countdown: RestCountdown
  requiredRestHours: number
  onStart: () => void
}

export type StatusCardProps =
  | AvailableStatusCardProps
  | RunningStatusCardProps
  | RestingStatusCardProps

export function StatusCard(props: StatusCardProps) {
  const { t } = useTranslation()

  switch (props.status) {
    case 'available':
      return (
        <View className="gap-4 py-4">
          <Text className="text-muted text-center text-sm">
            {t('generator.readyToRun')}
          </Text>
          <Button variant="primary" size="lg" onPress={props.onStart}>
            {t('generator.startGenerator')}
          </Button>
        </View>
      )
    case 'running':
      return <RunningCard {...props} />
    case 'resting':
      return <RestingCard {...props} />
    default:
      throw new Error(`Unknown status: ${props satisfies never}`)
  }
}

function RunningCard({
  elapsedTime,
  elapsedHours,
  consecutiveRunHours,
  maxConsecutiveRunHours,
  warningThresholdPct,
  onStop
}: RunningStatusCardProps) {
  const { t } = useTranslation()
  const totalRunHours = consecutiveRunHours + elapsedHours
  const progress = Math.min(totalRunHours / maxConsecutiveRunHours, 1)
  const warningFraction = warningThresholdPct / 100
  const timeColor =
    progress >= 1
      ? 'text-danger'
      : progress >= warningFraction
        ? 'text-warning'
        : 'text-success'

  return (
    <View className="gap-4 py-4">
      <Text
        className={`text-11 text-center leading-none font-semibold ${timeColor}`}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {elapsedTime}
      </Text>

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
            {t('generator.max', { hours: formatHours(maxConsecutiveRunHours) })}
          </Text>
        </View>
      </View>

      <Button variant="danger" size="lg" onPress={onStop}>
        {t('generator.stopGenerator')}
      </Button>
    </View>
  )
}

function RestingCard({
  countdown,
  requiredRestHours,
  onStart
}: RestingStatusCardProps) {
  const { t } = useTranslation()
  const restedHours = requiredRestHours * countdown.progress

  return (
    <View className="gap-4 py-4">
      <Text
        className="text-warning text-11 text-center leading-none font-semibold"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {countdown.remainingFormatted}
      </Text>

      <View className="gap-1.5">
        <View className="bg-default h-2 overflow-hidden rounded-full">
          <SkiaProgressBar
            progress={countdown.progress}
            warningFraction={1}
            height={8}
            mode="resting"
          />
        </View>
        <View className="flex-row justify-between">
          <Text className="text-muted text-3">
            {t('generator.rested', { hours: formatHours(restedHours) })}
          </Text>
          <Text className="text-muted text-3">
            {t('generator.required', { hours: formatHours(requiredRestHours) })}
          </Text>
        </View>
      </View>

      <Button
        variant="ghost"
        size="lg"
        onPress={() => confirmRestingStart(onStart)}
      >
        {t('generator.startGenerator')}
      </Button>
    </View>
  )
}
