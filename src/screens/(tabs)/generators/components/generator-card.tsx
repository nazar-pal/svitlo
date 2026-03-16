import { SymbolView } from 'expo-symbols'
import { Button } from 'heroui-native'
import { Alert, Pressable, Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import type { Generator, GeneratorSession } from '@/data/client/db-schema'
import { startSession, stopSession } from '@/data/client/mutations'
import {
  computeGeneratorStatus,
  computeLifetimeHours
} from '@/lib/hooks/use-generator-status'
import {
  useElapsedHours,
  useElapsedTime,
  formatHours
} from '@/lib/hooks/use-elapsed-time'
import type {
  NextMaintenanceCardInfo,
  MaintenanceUrgency
} from '@/lib/hooks/use-maintenance-due'
import { useRestCountdown } from '@/lib/hooks/use-rest-countdown'
import { formatRestRemaining } from '@/lib/time'

import { GeneratorStatusBadge } from '@/components/generator-status-badge'

interface GeneratorCardProps {
  generator: Generator
  sessions: GeneratorSession[]
  nextMaintenance: NextMaintenanceCardInfo | null
  userId: string
  onPress: () => void
}

function maintenanceLabel(info: NextMaintenanceCardInfo): string {
  if (info.urgency === 'overdue') return 'overdue'
  const { hoursRemaining, daysRemaining } = info
  if (hoursRemaining !== null && daysRemaining !== null) {
    // whichever_first — show the more urgent (smaller) dimension
    const daysAsHours = daysRemaining * 24
    return hoursRemaining <= daysAsHours
      ? `in ${formatHours(hoursRemaining)}`
      : `in ${Math.round(daysRemaining)}d`
  }
  if (hoursRemaining !== null) return `in ${formatHours(hoursRemaining)}`
  if (daysRemaining !== null) return `in ${Math.round(daysRemaining)}d`
  return ''
}

function maintenanceLabelColor(urgency: MaintenanceUrgency): string {
  if (urgency === 'overdue') return 'text-red-500'
  if (urgency === 'due_soon') return 'text-orange-500'
  return 'text-muted'
}

export function GeneratorCard({
  generator,
  sessions,
  nextMaintenance,
  userId,
  onPress
}: GeneratorCardProps) {
  const mutedColor = useCSSVariable('--color-muted') as string | undefined
  const { status, openSession, restEndsAt, consecutiveRunHours } =
    computeGeneratorStatus(generator, sessions)
  const lifetimeHours = computeLifetimeHours(sessions)

  const startedAt =
    status === 'running' ? (openSession?.startedAt ?? null) : null
  const elapsedHours = useElapsedHours(startedAt)
  const elapsedTimeStr = useElapsedTime(startedAt)

  const totalRunHours = consecutiveRunHours + elapsedHours
  const maxHours = generator.maxConsecutiveRunHours
  const progress = Math.min(totalRunHours / maxHours, 1)
  const warningFraction = generator.runWarningThresholdPct / 100
  const progressColor =
    progress >= 1
      ? 'bg-red-500'
      : progress >= warningFraction
        ? 'bg-orange-500'
        : 'bg-green-500'

  const restCountdown = useRestCountdown(
    restEndsAt,
    generator.requiredRestHours
  )

  async function handleStart() {
    const result = await startSession(userId, generator.id)
    if (!result.ok) Alert.alert('Error', result.error)
  }

  async function handleStop() {
    if (!openSession) return
    const result = await stopSession(userId, openSession.id)
    if (!result.ok) Alert.alert('Error', result.error)
  }

  return (
    <Pressable
      onPress={onPress}
      className="bg-surface-secondary rounded-2xl px-4 py-3.5 active:opacity-80"
    >
      <View className="flex-row items-center gap-3">
        <View className="bg-default size-10 items-center justify-center rounded-xl">
          <SymbolView name="bolt.fill" size={20} tintColor={mutedColor} />
        </View>

        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Text
              className="text-foreground flex-1 text-[17px] font-semibold"
              numberOfLines={1}
            >
              {generator.title}
            </Text>
            <GeneratorStatusBadge status={status} />
          </View>

          <View className="flex-row items-center gap-2">
            <Text className="text-muted text-[13px]">
              {formatHours(lifetimeHours)} total
            </Text>
            {status === 'resting' && restEndsAt ? (
              <>
                <Text className="text-muted text-[11px]">·</Text>
                <Text className="text-muted text-[13px]">
                  rests {formatRestRemaining(restEndsAt)}
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {status === 'running' ? (
        <View className="mt-3 gap-1.5">
          <View className="bg-default h-1.5 overflow-hidden rounded-full">
            <View
              className={`h-full rounded-full ${progressColor}`}
              style={{ width: `${progress * 100}%` }}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted text-[12px]">{elapsedTimeStr}</Text>
            <Text className="text-muted text-[12px]">
              {formatHours(totalRunHours)} / {formatHours(maxHours)}
            </Text>
          </View>
        </View>
      ) : null}

      {status === 'resting' && restEndsAt ? (
        <View className="mt-3 gap-1.5">
          <View className="bg-default h-1.5 overflow-hidden rounded-full">
            <View
              className="h-full rounded-full bg-orange-500"
              style={{ width: `${restCountdown.progress * 100}%` }}
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-muted text-[12px]">
              {restCountdown.remainingFormatted} remaining
            </Text>
            <Text className="text-muted text-[12px]">
              {formatHours(generator.requiredRestHours)} required
            </Text>
          </View>
        </View>
      ) : null}

      {nextMaintenance ? (
        <View className="mt-2.5 flex-row items-center gap-1.5">
          <SymbolView name="wrench.fill" size={12} tintColor={mutedColor} />
          <Text className="text-muted text-[13px]" numberOfLines={1}>
            {nextMaintenance.taskName}
            {' · '}
            <Text className={maintenanceLabelColor(nextMaintenance.urgency)}>
              {maintenanceLabel(nextMaintenance)}
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
          onPress={() =>
            Alert.alert(
              'Generator is Resting',
              'It\u2019s recommended to let the generator rest before starting again. Starting now may reduce its lifespan.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Start Anyway',
                  style: 'destructive',
                  onPress: handleStart
                }
              ]
            )
          }
        >
          Start
        </Button>
      ) : null}
    </Pressable>
  )
}
