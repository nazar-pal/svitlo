import { desc, eq } from 'drizzle-orm'
import * as Network from 'expo-network'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'

import {
  generators,
  generatorSessions,
  generatorUserAssignments,
  maintenanceRecords,
  maintenanceTemplates,
  organizationMembers,
  organizations,
  user
} from '@/data/client/db-schema'
import {
  assignUserToGenerator,
  startSession,
  stopSession,
  unassignUserFromGenerator
} from '@/data/client/mutations'
import { trpcClient } from '@/data/trpc/react'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import {
  formatHours,
  useElapsedHours,
  useElapsedTime
} from '@/lib/hooks/use-elapsed-time'
import {
  computeGeneratorStatus,
  computeLifetimeHours
} from '@/lib/hooks/use-generator-status'
import { useRestCountdown } from '@/lib/hooks/use-rest-countdown'
import { useLocalUser } from '@/lib/powersync'
import { db } from '@/lib/powersync/database'

import { AssignedEmployeesSection } from './assigned-employees-section'
import { ConfigurationSection } from './configuration-section'
import { setPendingSuggestions } from './maintenance-suggestions-store'
import { MaintenanceSection } from './maintenance-section'
import type { ActivityItem } from './recent-activity-section'
import { RecentActivitySection } from './recent-activity-section'
import type { StatusCardProps } from './status-card'
import { StatusCard } from './status-card'

export default function GeneratorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const localUser = useLocalUser()

  const userId = localUser?.id ?? ''
  const [isSuggesting, setIsSuggesting] = useState(false)

  // --- Data queries ---

  const { data: gens } = useDrizzleQuery(
    id ? db.select().from(generators).where(eq(generators.id, id)) : undefined
  )
  const generator = gens[0]

  const { data: sessions } = useDrizzleQuery(
    id
      ? db
          .select()
          .from(generatorSessions)
          .where(eq(generatorSessions.generatorId, id))
          .orderBy(desc(generatorSessions.startedAt))
      : undefined
  )

  const { data: templates } = useDrizzleQuery(
    id
      ? db
          .select()
          .from(maintenanceTemplates)
          .where(eq(maintenanceTemplates.generatorId, id))
      : undefined
  )

  const { data: records } = useDrizzleQuery(
    id
      ? db
          .select()
          .from(maintenanceRecords)
          .where(eq(maintenanceRecords.generatorId, id))
          .orderBy(desc(maintenanceRecords.performedAt))
      : undefined
  )

  const { data: assignments } = useDrizzleQuery(
    id
      ? db
          .select()
          .from(generatorUserAssignments)
          .where(eq(generatorUserAssignments.generatorId, id))
      : undefined
  )

  const { data: users } = useDrizzleQuery(db => db.select().from(user))

  const { data: allOrgs } = useDrizzleQuery(db =>
    db.select().from(organizations)
  )

  const { data: orgMembers } = useDrizzleQuery(
    generator
      ? db
          .select()
          .from(organizationMembers)
          .where(
            eq(organizationMembers.organizationId, generator.organizationId)
          )
      : undefined
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

  function getUserName(uid: string): string {
    return users.find(u => u.id === uid)?.name || 'Unknown'
  }

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
    const result = await trpcClient.ai.suggestMaintenancePlan
      .mutate({
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
          getUserName={getUserName}
          onViewAll={() =>
            router.push(`/generator/activity?generatorId=${id}`)
          }
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
            getUserName={getUserName}
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
