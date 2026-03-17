import { Text, View } from 'react-native'
import { Button } from 'heroui-native'

import { confirmRestingStart } from '@/lib/generator/confirm-resting-start'
import { progressColor } from '@/lib/generator/status'
import type { RestCountdown } from '@/lib/generator/use-rest-countdown'
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
  switch (props.status) {
    case 'available':
      return (
        <View className="gap-4 rounded-2xl pt-4 pb-4">
          <Text className="text-muted text-center text-sm">Ready to run</Text>
          <Button variant="primary" size="lg" onPress={props.onStart}>
            Start Generator
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
  const totalRunHours = consecutiveRunHours + elapsedHours
  const progress = Math.min(totalRunHours / maxConsecutiveRunHours, 1)
  const warningFraction = warningThresholdPct / 100
  const barColor = progressColor(progress, warningFraction)
  const timeColor =
    progress >= 1
      ? 'text-red-600'
      : progress >= warningFraction
        ? 'text-orange-600'
        : 'text-green-600'

  return (
    <View className="gap-4 rounded-2xl pt-4 pb-4">
      <Text
        className={`text-center text-[44px] leading-none font-semibold ${timeColor}`}
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {elapsedTime}
      </Text>

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
            {formatHours(maxConsecutiveRunHours)} max
          </Text>
        </View>
      </View>

      <Button variant="danger" size="lg" onPress={onStop}>
        Stop Generator
      </Button>
    </View>
  )
}

function RestingCard({
  countdown,
  requiredRestHours,
  onStart
}: RestingStatusCardProps) {
  const restedHours = requiredRestHours * countdown.progress
  const restBarColor =
    countdown.progress >= 1 ? 'bg-green-500' : 'bg-orange-500'

  return (
    <View className="gap-4 rounded-2xl pt-4 pb-4">
      <Text
        className="text-center text-[44px] leading-none font-semibold text-orange-600"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {countdown.remainingFormatted}
      </Text>

      <View className="gap-1.5">
        <View className="bg-default h-2 overflow-hidden rounded-full">
          <View
            className={`h-full rounded-full ${restBarColor}`}
            style={{ width: `${countdown.progress * 100}%` }}
          />
        </View>
        <View className="flex-row justify-between">
          <Text className="text-muted text-[12px]">
            {formatHours(restedHours)} rested
          </Text>
          <Text className="text-muted text-[12px]">
            {formatHours(requiredRestHours)} required
          </Text>
        </View>
      </View>

      <Button
        variant="ghost"
        size="lg"
        onPress={() => confirmRestingStart(onStart)}
      >
        Start Generator
      </Button>
    </View>
  )
}
