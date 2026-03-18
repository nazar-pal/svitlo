import { SymbolView } from 'expo-symbols'
import {
  Button,
  PressableFeedback,
  Surface,
  useThemeColor
} from 'heroui-native'
import { Alert, Text, View } from 'react-native'

import type { Generator, GeneratorSession } from '@/data/client/db-schema'
import { notifySuccess } from '@/lib/haptics'
import { startSession, stopSession } from '@/data/client/mutations'
import { GeneratorStatusBadge } from '@/components/generator-status-badge'
import { SkiaProgressBar } from '@/components/skia-progress-bar'
import { confirmRestingStart } from '@/lib/generator/confirm-resting-start'
import {
  computeGeneratorStatus,
  computeLifetimeHours
} from '@/lib/generator/status'
import {
  useElapsedHours,
  useElapsedTime
} from '@/lib/generator/use-elapsed-time'
import { useRestCountdown } from '@/lib/generator/use-rest-countdown'
import {
  formatMaintenanceLabel,
  type MaintenanceUrgency,
  type NextMaintenanceCardInfo
} from '@/lib/maintenance/due'
import { formatHours, formatRestRemaining } from '@/lib/utils/time'

interface GeneratorCardProps {
  generator: Generator
  sessions: GeneratorSession[]
  nextMaintenance: NextMaintenanceCardInfo | null
  userId: string
  onPress: () => void
  variant?: 'compact' | 'detailed'
}

function maintenanceLabelColor(urgency: MaintenanceUrgency): string {
  if (urgency === 'overdue') return 'text-danger'
  if (urgency === 'due_soon') return 'text-warning'
  return 'text-muted'
}

function maintenanceLabelText(info: NextMaintenanceCardInfo): string {
  if (info.urgency === 'overdue') return 'overdue'
  return formatMaintenanceLabel(info)
}

export function GeneratorCard({
  generator,
  sessions,
  nextMaintenance,
  userId,
  onPress,
  variant = 'detailed'
}: GeneratorCardProps) {
  const mutedColor = useThemeColor('muted')
  const { status, openSession, restEndsAt, consecutiveRunHours } =
    computeGeneratorStatus(generator, sessions)

  const startedAt =
    status === 'running' ? (openSession?.startedAt ?? null) : null
  const elapsedHours = useElapsedHours(startedAt)
  const elapsedTimeStr = useElapsedTime(
    variant === 'detailed' ? startedAt : null
  )

  const totalRunHours = consecutiveRunHours + elapsedHours
  const maxHours = generator.maxConsecutiveRunHours
  const progress = Math.min(totalRunHours / maxHours, 1)
  const warningFraction = generator.runWarningThresholdPct / 100

  const restCountdown = useRestCountdown(
    restEndsAt,
    generator.requiredRestHours
  )

  const lifetimeHours =
    variant === 'detailed' ? computeLifetimeHours(sessions) : 0

  async function handleStart() {
    const result = await startSession(userId, generator.id)
    if (!result.ok) return Alert.alert('Error', result.error)
    notifySuccess()
  }

  async function handleStop() {
    if (!openSession) return
    const result = await stopSession(userId, openSession.id)
    if (!result.ok) return Alert.alert('Error', result.error)
    notifySuccess()
  }

  return (
    <PressableFeedback onPress={onPress}>
      <Surface variant="secondary">
        <View className="flex-row items-center gap-3">
          <View className="bg-default size-10 items-center justify-center rounded-xl">
            <SymbolView name="bolt.fill" size={20} tintColor={mutedColor} />
          </View>

          <View className="flex-1 gap-1">
            <View className="flex-row items-center gap-2">
              <Text
                className="text-foreground text-4.25 flex-1 font-semibold"
                numberOfLines={1}
              >
                {generator.title}
              </Text>
              <GeneratorStatusBadge status={status} />
            </View>

            {variant === 'compact' ? (
              <Text className="text-muted text-3.25">{generator.model}</Text>
            ) : (
              <View className="flex-row items-center gap-2">
                <Text className="text-muted text-3.25">
                  {formatHours(lifetimeHours)} total
                </Text>
                {status === 'resting' && restEndsAt ? (
                  <>
                    <Text className="text-muted text-2.75">·</Text>
                    <Text className="text-muted text-3.25">
                      rests {formatRestRemaining(restEndsAt)}
                    </Text>
                  </>
                ) : null}
              </View>
            )}
          </View>

          {variant === 'compact' ? (
            <SymbolView name="chevron.right" size={14} tintColor={mutedColor} />
          ) : null}
        </View>

        {status === 'running' ? (
          <View className="mt-3 gap-1.5">
            <View className="bg-default h-1.5 overflow-hidden rounded-full">
              <SkiaProgressBar
                progress={progress}
                warningFraction={warningFraction}
                height={6}
              />
            </View>
            <View className="flex-row justify-between">
              {variant === 'compact' ? (
                <>
                  <Text className="text-muted text-3">
                    {formatHours(totalRunHours)} elapsed
                  </Text>
                  <Text className="text-muted text-3">
                    {formatHours(maxHours)} max
                  </Text>
                </>
              ) : (
                <>
                  <Text className="text-muted text-3">{elapsedTimeStr}</Text>
                  <Text className="text-muted text-3">
                    {formatHours(totalRunHours)} / {formatHours(maxHours)}
                  </Text>
                </>
              )}
            </View>
          </View>
        ) : null}

        {status === 'resting' && restEndsAt ? (
          <View className="mt-3 gap-1.5">
            <View className="bg-default h-1.5 overflow-hidden rounded-full">
              <SkiaProgressBar
                progress={restCountdown.progress}
                warningFraction={1}
                height={6}
                mode="resting"
              />
            </View>
            <View className="flex-row justify-between">
              <Text className="text-muted text-3">
                {restCountdown.remainingFormatted} remaining
              </Text>
              <Text className="text-muted text-3">
                {formatHours(generator.requiredRestHours)} required
              </Text>
            </View>
          </View>
        ) : null}

        {nextMaintenance ? (
          <View className="mt-2.5 flex-row items-center gap-1.5">
            <SymbolView name="wrench.fill" size={12} tintColor={mutedColor} />
            <Text className="text-muted text-3.25" numberOfLines={1}>
              {nextMaintenance.taskName}
              {' · '}
              <Text className={maintenanceLabelColor(nextMaintenance.urgency)}>
                {maintenanceLabelText(nextMaintenance)}
              </Text>
            </Text>
          </View>
        ) : null}

        {status === 'available' ? (
          <Button
            variant="primary"
            size="md"
            className="mt-3"
            onPress={handleStart}
          >
            Start
          </Button>
        ) : status === 'running' ? (
          <Button
            variant="danger"
            size="md"
            className="mt-3"
            onPress={handleStop}
          >
            Stop
          </Button>
        ) : status === 'resting' ? (
          <Button
            variant="ghost"
            size="md"
            className="mt-3"
            onPress={() => confirmRestingStart(handleStart)}
          >
            Start
          </Button>
        ) : null}
      </Surface>
    </PressableFeedback>
  )
}
