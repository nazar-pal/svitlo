import { SymbolView } from 'expo-symbols'
import { Button, Separator, Surface, useThemeColor } from 'heroui-native'
import { Alert, Text, View } from 'react-native'

import { SkiaProgressBar } from '@/components/skia-progress-bar'
import type { Generator } from '@/data/client/db-schema'
import { startSession, stopSession } from '@/data/client/mutations'
import { confirmRestingStart } from '@/lib/generator/confirm-resting-start'
import {
  GENERATOR_STATUS_KEYS,
  type GeneratorStatusInfo
} from '@/lib/generator/status'
import {
  useElapsedHours,
  useElapsedTime
} from '@/lib/generator/use-elapsed-time'
import { useRestCountdown } from '@/lib/generator/use-rest-countdown'
import { notifySuccess } from '@/lib/haptics'
import { useTranslation } from '@/lib/i18n'
import {
  formatMaintenanceLabel,
  type MaintenanceUrgency,
  type NextMaintenanceCardInfo
} from '@/lib/maintenance/due'
import { formatHours } from '@/lib/utils/time'

export interface HeroCardItem {
  generator: Generator
  statusInfo: GeneratorStatusInfo
  nextMaintenance: NextMaintenanceCardInfo | null
  isMyActiveSession: boolean
  lifetimeHours: number
  assignedUserNames: string[]
}

interface HeroCardProps {
  item: HeroCardItem
  userId: string
}

function maintenanceLabelColor(urgency: MaintenanceUrgency): string {
  if (urgency === 'overdue') return 'text-danger'
  if (urgency === 'due_soon') return 'text-warning'
  return 'text-muted'
}

function formatAssignedNames(names: string[], max = 2): string {
  if (names.length <= max) return names.join(', ')
  return `${names.slice(0, max).join(', ')} +${names.length - max}`
}

export function HeroCard({ item, userId }: HeroCardProps) {
  const { t } = useTranslation()
  const [mutedColor, successColor, accentColor, dangerColor, warningColor] =
    useThemeColor(['muted', 'success', 'accent', 'danger', 'warning'])

  const {
    generator,
    statusInfo,
    nextMaintenance,
    isMyActiveSession,
    lifetimeHours,
    assignedUserNames
  } = item

  const { status, openSession, restEndsAt, consecutiveRunHours } = statusInfo

  const startedAt =
    status === 'running' ? (openSession?.startedAt ?? null) : null
  const elapsedHours = useElapsedHours(startedAt)
  const elapsedTimeStr = useElapsedTime(startedAt)

  const totalRunHours = consecutiveRunHours + elapsedHours
  const maxHours = generator.maxConsecutiveRunHours
  const progress = Math.min(totalRunHours / maxHours, 1)
  const warningFraction = generator.runWarningThresholdPct / 100

  const restCountdown = useRestCountdown(
    restEndsAt,
    generator.requiredRestHours
  )

  const timeColor =
    progress >= 1
      ? 'text-danger'
      : progress >= warningFraction
        ? 'text-warning'
        : 'text-success'

  function maintenanceLabelText(info: NextMaintenanceCardInfo): string {
    if (info.urgency === 'overdue') return t('generator.overdue')
    return formatMaintenanceLabel(info)
  }

  async function handleStart() {
    const result = await startSession(userId, generator.id)
    if (!result.ok) return Alert.alert(t('common.error'), result.error)
    notifySuccess()
  }

  async function handleStop() {
    if (!openSession) return
    const result = await stopSession(userId, openSession.id)
    if (!result.ok) return Alert.alert(t('common.error'), result.error)
    notifySuccess()
  }

  const maintenanceIconBg =
    nextMaintenance?.urgency === 'overdue'
      ? 'bg-danger/15'
      : nextMaintenance?.urgency === 'due_soon'
        ? 'bg-warning/15'
        : 'bg-default'

  const maintenanceIconColor =
    nextMaintenance?.urgency === 'overdue'
      ? dangerColor
      : nextMaintenance?.urgency === 'due_soon'
        ? warningColor
        : mutedColor

  return (
    <View className="flex-1 gap-5">
      {/* Header: Status badge + model + active session */}
      <View className="gap-2">
        {isMyActiveSession ? (
          <View className="flex-row items-center gap-1.5">
            <View className="bg-success/15 size-5 items-center justify-center rounded-md">
              <SymbolView name="bolt.fill" size={10} tintColor={successColor} />
            </View>
            <Text className="text-success text-xs font-semibold tracking-wide uppercase">
              {t('home.myActiveSession')}
            </Text>
          </View>
        ) : null}
        <Text className="text-muted text-sm" numberOfLines={1}>
          {generator.model}
          {generator.description ? ` · ${generator.description}` : ''}
        </Text>
      </View>

      {/* Status visualization */}
      <View className="flex-1 justify-center">
        {status === 'running' ? (
          <Surface variant="tertiary" className="gap-5 overflow-hidden">
            <View className="bg-success/8 -m-4 mb-0 items-center p-4 pb-3">
              <Text className="text-success/60 text-xs font-semibold tracking-widest uppercase">
                {t(GENERATOR_STATUS_KEYS[status])}
              </Text>
            </View>

            <View className="items-center py-2">
              <Text
                className={`text-13 text-center leading-none font-bold tracking-tight ${timeColor}`}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {elapsedTimeStr}
              </Text>
            </View>

            <View className="gap-1.5">
              <View className="bg-default h-2.5 overflow-hidden rounded-full">
                <SkiaProgressBar
                  progress={progress}
                  warningFraction={warningFraction}
                  height={10}
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted text-3">
                  {t('generator.elapsed', {
                    hours: formatHours(totalRunHours)
                  })}
                </Text>
                <Text className="text-muted text-3">
                  {t('generator.max', { hours: formatHours(maxHours) })}
                </Text>
              </View>
            </View>
          </Surface>
        ) : status === 'resting' ? (
          <Surface variant="tertiary" className="gap-5 overflow-hidden">
            <View className="bg-warning/8 -m-4 mb-0 items-center p-4 pb-3">
              <Text className="text-warning/60 text-xs font-semibold tracking-widest uppercase">
                {t(GENERATOR_STATUS_KEYS[status])}
              </Text>
            </View>

            <View className="items-center py-2">
              <Text
                className="text-warning text-13 text-center leading-none font-bold tracking-tight"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {restCountdown.remainingFormatted}
              </Text>
            </View>

            <View className="gap-1.5">
              <View className="bg-default h-2.5 overflow-hidden rounded-full">
                <SkiaProgressBar
                  progress={restCountdown.progress}
                  warningFraction={1}
                  height={10}
                  mode="resting"
                />
              </View>
              <View className="flex-row justify-between">
                <Text className="text-muted text-3">
                  {t('generator.remaining', {
                    time: restCountdown.remainingFormatted
                  })}
                </Text>
                <Text className="text-muted text-3">
                  {t('generator.required', {
                    hours: formatHours(generator.requiredRestHours)
                  })}
                </Text>
              </View>
            </View>
          </Surface>
        ) : (
          <Surface variant="tertiary" className="items-center gap-4 py-8">
            <View className="bg-accent/10 size-24 items-center justify-center rounded-full">
              <SymbolView name="bolt.fill" size={44} tintColor={accentColor} />
            </View>
            <Text className="text-foreground text-lg font-semibold">
              {t('generator.readyToRun')}
            </Text>
          </Surface>
        )}
      </View>

      {/* Info panel */}
      <Surface variant="tertiary" className="gap-0 p-0">
        <View className="flex-row items-center gap-2.5 px-4 py-3">
          <View className="bg-default size-8 items-center justify-center rounded-lg">
            <SymbolView name="clock.fill" size={15} tintColor={mutedColor} />
          </View>
          <Text className="text-muted flex-1 text-sm" numberOfLines={1}>
            {t('generator.lifetimeHours', {
              hours: formatHours(lifetimeHours)
            })}
          </Text>
        </View>

        {nextMaintenance ? (
          <>
            <Separator />
            <View className="flex-row items-center gap-2.5 px-4 py-3">
              <View
                className={`${maintenanceIconBg} size-8 items-center justify-center rounded-lg`}
              >
                <SymbolView
                  name="wrench.fill"
                  size={15}
                  tintColor={maintenanceIconColor}
                />
              </View>
              <Text className="text-muted flex-1 text-sm" numberOfLines={1}>
                {nextMaintenance.taskName}
                {' · '}
                <Text
                  className={maintenanceLabelColor(nextMaintenance.urgency)}
                >
                  {maintenanceLabelText(nextMaintenance)}
                </Text>
              </Text>
            </View>
          </>
        ) : null}

        {assignedUserNames.length > 0 ? (
          <>
            <Separator />
            <View className="flex-row items-center gap-2.5 px-4 py-3">
              <View className="bg-default size-8 items-center justify-center rounded-lg">
                <SymbolView
                  name="person.2.fill"
                  size={15}
                  tintColor={mutedColor}
                />
              </View>
              <Text className="text-muted flex-1 text-sm" numberOfLines={1}>
                {formatAssignedNames(assignedUserNames)}
              </Text>
            </View>
          </>
        ) : null}
      </Surface>

      {/* Action button */}
      {status === 'available' ? (
        <Button variant="primary" size="lg" onPress={handleStart}>
          {t('generator.startGenerator')}
        </Button>
      ) : status === 'running' ? (
        <Button variant="danger" size="lg" onPress={handleStop}>
          {t('generator.stopGenerator')}
        </Button>
      ) : status === 'resting' ? (
        <Button
          variant="ghost"
          size="lg"
          onPress={() => confirmRestingStart(handleStart)}
        >
          {t('generator.startGenerator')}
        </Button>
      ) : null}
    </View>
  )
}
