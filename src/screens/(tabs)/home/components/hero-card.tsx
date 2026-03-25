import type { ComponentProps, ReactNode } from 'react'
import { SymbolView } from 'expo-symbols'
import { useThemeColor } from 'heroui-native'
import { Pressable, Text, View } from 'react-native'

import { SkiaProgressBar } from '@/components/skia-progress-bar'
import type { Generator } from '@/data/client/db-schema'
import {
  alertOnError,
  startSession,
  stopSession
} from '@/data/client/mutations'
import { confirmRestingStart } from '@/lib/alerts'
import {
  GENERATOR_STATUS_KEYS,
  type GeneratorStatus,
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

import { IdlePulse } from './idle-pulse'

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

function statusColorClass(status: GeneratorStatus): string {
  switch (status) {
    case 'running':
      return 'text-success/60'
    case 'resting':
      return 'text-warning/60'
    case 'available':
      return 'text-accent/60'
    default:
      throw new Error(`Unknown status: ${status satisfies never}`)
  }
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

function StatusHeader({
  status,
  isMyActiveSession
}: {
  status: GeneratorStatus
  isMyActiveSession: boolean
}) {
  const { t } = useTranslation()
  const successColor = useThemeColor('success')

  return (
    <View className="flex-row items-center">
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
      <Text
        className={`${statusColorClass(status)} ml-auto text-xs font-semibold tracking-widest uppercase`}
      >
        {t(GENERATOR_STATUS_KEYS[status])}
      </Text>
    </View>
  )
}

type SymbolName = ComponentProps<typeof SymbolView>['name']

function InfoRow({
  icon,
  iconBgClass,
  iconColor,
  children
}: {
  icon: SymbolName
  iconBgClass?: string
  iconColor: string
  children: ReactNode
}) {
  return (
    <View className="bg-background flex-row items-center gap-2.5 px-3.5 py-3">
      <View
        className={`${iconBgClass ?? 'bg-default'} size-8 items-center justify-center rounded-lg`}
      >
        <SymbolView name={icon} size={15} tintColor={iconColor} />
      </View>
      <Text className="text-muted flex-1 text-sm" numberOfLines={1}>
        {children}
      </Text>
    </View>
  )
}

export function HeroCard({ item, userId }: HeroCardProps) {
  const { t } = useTranslation()
  const [mutedColor, accentColor, dangerColor, warningColor, successColor] =
    useThemeColor(['muted', 'accent', 'danger', 'warning', 'success'])

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
    if (alertOnError(result)) return
    notifySuccess()
  }

  async function handleStop() {
    if (!openSession) return
    const result = await stopSession(userId, openSession.id)
    if (alertOnError(result)) return
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
    <View className="flex-1 overflow-hidden">
      {/* Content layer */}
      <View className="flex-1 gap-4 p-5">
        <StatusHeader status={status} isMyActiveSession={isMyActiveSession} />

        {/* Generator identity */}
        <View className="gap-1">
          <Text className="text-foreground text-xl font-bold" numberOfLines={1}>
            {generator.model}
          </Text>
          {generator.description ? (
            <Text className="text-muted text-sm" numberOfLines={2}>
              {generator.description}
            </Text>
          ) : null}
        </View>

        {/* Elastic center: tappable status visualization */}
        <Pressable
          onPress={
            status === 'running'
              ? handleStop
              : status === 'resting'
                ? () => confirmRestingStart(handleStart)
                : handleStart
          }
          accessibilityRole="button"
          accessibilityLabel={
            status === 'running'
              ? t('generator.stopGenerator')
              : t('generator.startGenerator')
          }
          className="flex-1 items-center justify-center gap-5 active:opacity-80"
        >
          {status === 'running' ? (
            <>
              <Text
                className={`text-13 text-center leading-none font-bold tracking-tight ${timeColor}`}
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {elapsedTimeStr}
              </Text>

              <View className="size-24 items-center justify-center">
                <IdlePulse color={successColor} />
                <View className="border-success/20 bg-success/8 size-18 items-center justify-center rounded-full border">
                  <SymbolView
                    name="stop.fill"
                    size={28}
                    tintColor={successColor}
                  />
                </View>
              </View>

              <Text className="text-success text-base font-medium">
                {t('generator.tapToStop')}
              </Text>

              <View className="w-full gap-1.5">
                <View className="bg-default h-2.5 overflow-hidden rounded-full">
                  <SkiaProgressBar
                    progress={progress}
                    warningFraction={warningFraction}
                    height={10}
                  />
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-muted text-xs">
                    {t('generator.elapsed', {
                      hours: formatHours(totalRunHours)
                    })}
                  </Text>
                  <Text className="text-muted text-xs">
                    {t('generator.max', { hours: formatHours(maxHours) })}
                  </Text>
                </View>
              </View>
            </>
          ) : status === 'resting' ? (
            <>
              <Text
                className="text-warning text-13 text-center leading-none font-bold tracking-tight"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {restCountdown.remainingFormatted}
              </Text>

              <View className="size-24 items-center justify-center">
                <IdlePulse color={warningColor} />
                <View className="border-warning/20 bg-warning/8 size-18 items-center justify-center rounded-full border">
                  <SymbolView
                    name="bolt.fill"
                    size={28}
                    tintColor={warningColor}
                  />
                </View>
              </View>

              <Text className="text-warning text-base font-medium">
                {t('generatorStatus.resting')}
              </Text>

              <View className="w-full gap-1.5">
                <View className="bg-default h-2.5 overflow-hidden rounded-full">
                  <SkiaProgressBar
                    progress={restCountdown.progress}
                    warningFraction={1}
                    height={10}
                    mode="resting"
                  />
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-muted text-xs">
                    {t('generator.remaining', {
                      time: restCountdown.remainingFormatted
                    })}
                  </Text>
                  <Text className="text-muted text-xs">
                    {t('generator.required', {
                      hours: formatHours(generator.requiredRestHours)
                    })}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View className="size-40 items-center justify-center">
                <IdlePulse />
                <View className="border-accent/20 bg-accent/8 size-30 items-center justify-center rounded-full border">
                  <SymbolView
                    name="bolt.fill"
                    size={52}
                    tintColor={accentColor}
                  />
                </View>
              </View>
              <Text className="text-accent text-base font-medium">
                {t('generator.readyToRun')}
              </Text>
            </>
          )}
        </Pressable>

        {/* Info rows */}
        <View className="bg-default/40 gap-px overflow-hidden rounded-2xl">
          <InfoRow icon="clock.fill" iconColor={mutedColor}>
            {t('generator.lifetimeHours', {
              hours: formatHours(lifetimeHours)
            })}
          </InfoRow>

          {nextMaintenance ? (
            <InfoRow
              icon="wrench.fill"
              iconBgClass={maintenanceIconBg}
              iconColor={maintenanceIconColor}
            >
              {nextMaintenance.taskName}
              {' · '}
              <Text className={maintenanceLabelColor(nextMaintenance.urgency)}>
                {maintenanceLabelText(nextMaintenance)}
              </Text>
            </InfoRow>
          ) : null}

          {assignedUserNames.length > 0 ? (
            <InfoRow icon="person.2.fill" iconColor={mutedColor}>
              {formatAssignedNames(assignedUserNames)}
            </InfoRow>
          ) : null}
        </View>
      </View>
    </View>
  )
}
