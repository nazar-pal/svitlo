import { SymbolView } from 'expo-symbols'
import { Button } from 'heroui-native'
import { Alert, Pressable, Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import type { Generator, GeneratorSession } from '@/data/client/db-schema'
import { startSession, stopSession } from '@/data/client/mutations'
import { GeneratorStatusBadge } from '@/components/generator-status-badge'
import { useElapsedHours, formatHours } from '@/lib/hooks/use-elapsed-time'
import { computeGeneratorStatus } from '@/lib/hooks/use-generator-status'
import type { NextMaintenanceCardInfo } from '@/lib/hooks/use-maintenance-due'
import { formatRestRemaining } from '@/lib/time'

import { formatUpcoming } from '../helpers'

interface MyGeneratorCardProps {
  generator: Generator
  sessions: GeneratorSession[]
  nextMaintenance: NextMaintenanceCardInfo | null
  userId: string
  onPress: () => void
}

export function MyGeneratorCard({
  generator,
  sessions,
  nextMaintenance,
  userId,
  onPress
}: MyGeneratorCardProps) {
  const mutedColor = useCSSVariable('--color-muted') as string | undefined
  const { status, openSession, restEndsAt, consecutiveRunHours } =
    computeGeneratorStatus(generator, sessions)
  const elapsedHours = useElapsedHours(
    status === 'running' ? (openSession?.startedAt ?? null) : null
  )

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
          <Text className="text-muted text-[13px]">
            {generator.generatorType}
          </Text>
        </View>
        <SymbolView name="chevron.right" size={14} tintColor={mutedColor} />
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
            <Text className="text-muted text-[12px]">
              {formatHours(totalRunHours)} elapsed
            </Text>
            <Text className="text-muted text-[12px]">
              {formatHours(maxHours)} max
            </Text>
          </View>
        </View>
      ) : null}

      {status === 'resting' && restEndsAt ? (
        <Text className="text-muted mt-2 text-[13px]">
          Ready in {formatRestRemaining(restEndsAt)}
        </Text>
      ) : null}

      {nextMaintenance ? (
        <View className="mt-2.5 flex-row items-center gap-1.5">
          <SymbolView name="wrench.fill" size={12} tintColor={mutedColor} />
          <Text className="text-muted text-[13px]" numberOfLines={1}>
            {nextMaintenance.taskName}
            {' · '}
            <Text
              className={
                nextMaintenance.urgency === 'overdue'
                  ? 'text-red-500'
                  : nextMaintenance.urgency === 'due_soon'
                    ? 'text-orange-500'
                    : 'text-muted'
              }
            >
              {nextMaintenance.urgency === 'overdue'
                ? 'overdue'
                : formatUpcoming(nextMaintenance)}
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
      ) : null}
    </Pressable>
  )
}
