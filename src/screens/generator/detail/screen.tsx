import * as Network from 'expo-network'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'

import {
  assignUserToGenerator,
  startSession,
  stopSession,
  unassignUserFromGenerator
} from '@/data/client/mutations'
import {
  getAllOrganizations,
  getAllUsers,
  getGenerator,
  getGeneratorAssignments,
  getGeneratorSessions,
  getMaintenanceRecords,
  getMaintenanceTemplates,
  getOrgMembers
} from '@/data/client/queries'
import { rpcClient } from '@/data/rpc-client'
import {
  computeGeneratorStatus,
  computeLifetimeHours
} from '@/lib/generator/status'
import {
  useElapsedHours,
  useElapsedTime
} from '@/lib/generator/use-elapsed-time'
import { useRestCountdown } from '@/lib/generator/use-rest-countdown'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'
import { getUserName } from '@/lib/utils/get-user-name'
import { formatHours } from '@/lib/utils/time'

import { AssignedEmployeesSection } from './components/assigned-employees-section'
import { ConfigurationSection } from './components/configuration-section'
import { MaintenanceSection } from './components/maintenance-section'
import type { ActivityItem } from '@/lib/generator/activity-item'
import { RecentActivitySection } from './components/recent-activity-section'
import type { StatusCardProps } from './components/status-card'
import { StatusCard } from './components/status-card'
import { setPendingSuggestions } from '@/lib/maintenance/suggestions-store'

export default function GeneratorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const localUser = useLocalUser()

  const userId = localUser?.id ?? ''
  const [isSuggesting, setIsSuggesting] = useState(false)

  // --- Data queries ---

  const { data: gens } = useDrizzleQuery(id ? getGenerator(id) : undefined)
  const generator = gens[0]

  const { data: sessions } = useDrizzleQuery(
    id ? getGeneratorSessions(id) : undefined
  )

  const { data: templates } = useDrizzleQuery(
    id ? getMaintenanceTemplates(id) : undefined
  )

  const { data: records } = useDrizzleQuery(
    id ? getMaintenanceRecords(id) : undefined
  )

  const { data: assignments } = useDrizzleQuery(
    id ? getGeneratorAssignments(id) : undefined
  )

  const { data: users } = useDrizzleQuery(getAllUsers())

  const { data: allOrgs } = useDrizzleQuery(getAllOrganizations())

  const { data: orgMembers } = useDrizzleQuery(
    generator ? getOrgMembers(generator.organizationId) : undefined
  )

  // --- Computed state ---

  const statusInfo = generator
    ? computeGeneratorStatus(generator, sessions)
    : null
  const elapsedTime = useElapsedTime(statusInfo?.openSession?.startedAt ?? null)
  const elapsedHours = useElapsedHours(
    statusInfo?.openSession?.startedAt ?? null
  )
  const restCountdown = useRestCountdown(
    statusInfo?.restEndsAt ?? null,
    generator?.requiredRestHours ?? 0
  )

  if (!generator || !statusInfo) return null

  const org = allOrgs.find(o => o.id === generator.organizationId)
  const isAdmin = org?.adminUserId === userId
  const lifetimeHours = computeLifetimeHours(sessions)

  const assignedUserIds = new Set(assignments.map(a => a.userId))
  const unassignedMembers = orgMembers.filter(
    m => !assignedUserIds.has(m.userId)
  )

  // --- Activity feed ---

  const activityItems: ActivityItem[] = [
    ...sessions.map(s => ({
      type: 'session' as const,
      id: s.id,
      timestamp: s.startedAt,
      startedByUserId: s.startedByUserId,
      startedAt: s.startedAt,
      stoppedAt: s.stoppedAt
    })),
    ...records.map(r => ({
      type: 'maintenance' as const,
      id: r.id,
      timestamp: r.performedAt,
      performedByUserId: r.performedByUserId,
      performedAt: r.performedAt,
      templateName:
        templates.find(t => t.id === r.templateId)?.taskName ?? 'Unknown task',
      notes: r.notes
    }))
  ]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5)

  // --- Handlers ---

  const resolveUserName = (uid: string) => getUserName(users, uid)

  async function handleStartSession() {
    const result = await startSession(userId, id)
    if (!result.ok) Alert.alert('Error', result.error)
  }

  async function handleStopSession() {
    if (!statusInfo?.openSession) return
    const result = await stopSession(userId, statusInfo.openSession.id)
    if (!result.ok) Alert.alert('Error', result.error)
  }

  async function handleAssign(targetUserId: string) {
    const result = await assignUserToGenerator(userId, id, targetUserId)
    if (!result.ok) Alert.alert('Error', result.error)
  }

  function handleUnassign(targetUserId: string) {
    Alert.alert('Unassign', 'Remove this user from this generator?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const result = await unassignUserFromGenerator(
            userId,
            id,
            targetUserId
          )
          if (!result.ok) Alert.alert('Error', result.error)
        }
      }
    ])
  }

  async function handleSuggestMaintenance() {
    const networkState = await Network.getNetworkStateAsync()
    if (!networkState.isConnected || !networkState.isInternetReachable) {
      Alert.alert(
        'Offline',
        'Internet connection is required for AI suggestions.'
      )
      return
    }

    setIsSuggesting(true)
    const result = await rpcClient.ai
      .suggestMaintenancePlan({
        generatorModel: generator.model,
        description: generator.description ?? undefined
      })
      .catch((error: unknown) => {
        Alert.alert(
          'Error',
          error instanceof Error ? error.message : 'Failed to get suggestions'
        )
        return null
      })
    setIsSuggesting(false)

    if (result) {
      setPendingSuggestions(result)
      router.push(`/maintenance/add-suggestions?generatorId=${id}`)
    }
  }

  // --- Status card props ---

  const statusCardProps: StatusCardProps =
    statusInfo.status === 'available'
      ? { status: 'available', onStart: handleStartSession }
      : statusInfo.status === 'running'
        ? {
            status: 'running',
            elapsedTime,
            elapsedHours,
            consecutiveRunHours: statusInfo.consecutiveRunHours,
            maxConsecutiveRunHours: generator.maxConsecutiveRunHours,
            warningThresholdPct: generator.runWarningThresholdPct,
            onStop: handleStopSession
          }
        : {
            status: 'resting',
            countdown: restCountdown,
            requiredRestHours: generator.requiredRestHours,
            onStart: handleStartSession
          }

  return (
    <ScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10 pt-4"
    >
      <Stack.Screen options={{ title: generator.title }} />
      <View className="mx-auto w-full max-w-[600px] gap-6">
        {/* Generator Info */}
        <View className="items-center gap-1 pt-4">
          <Text className="text-muted text-center text-[15px]">
            {generator.model}
            {generator.description ? ` · ${generator.description}` : ''}
          </Text>
          <Text className="text-muted text-[13px]">
            {formatHours(lifetimeHours)} lifetime hours
          </Text>
        </View>

        {/* Status Card */}
        <StatusCard {...statusCardProps} />

        {/* Recent Activity */}
        <RecentActivitySection
          items={activityItems}
          getUserName={resolveUserName}
          onViewAll={() => router.push(`/generator/activity?generatorId=${id}`)}
        />

        {/* Maintenance Templates */}
        <MaintenanceSection
          templates={templates}
          records={records}
          generatorId={id}
          isAdmin={isAdmin}
          isSuggesting={isSuggesting}
          onSuggest={handleSuggestMaintenance}
          onAddTemplate={() =>
            router.push(`/maintenance/create-template?generatorId=${id}`)
          }
          onRecordMaintenance={templateId =>
            router.push(
              `/maintenance/record?templateId=${templateId}&generatorId=${id}`
            )
          }
        />

        {/* Assigned Employees (Admin only) */}
        {isAdmin ? (
          <AssignedEmployeesSection
            assignments={assignments}
            unassignedMembers={unassignedMembers}
            getUserName={resolveUserName}
            onAssign={handleAssign}
            onUnassign={handleUnassign}
          />
        ) : null}

        {/* Configuration (static, at bottom) */}
        <ConfigurationSection
          maxConsecutiveRunHours={generator.maxConsecutiveRunHours}
          requiredRestHours={generator.requiredRestHours}
          runWarningThresholdPct={generator.runWarningThresholdPct}
        />
      </View>
    </ScrollView>
  )
}
