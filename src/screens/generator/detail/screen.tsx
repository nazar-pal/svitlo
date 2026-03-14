import { differenceInMilliseconds, format, parseISO } from 'date-fns'
import { desc, eq } from 'drizzle-orm'
import * as Network from 'expo-network'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { Button, ListGroup, Separator } from 'heroui-native'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View
} from 'react-native'
import { useCSSVariable } from 'uniwind'

import { GeneratorStatusBadge } from '@/components/generator-status-badge'
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
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import {
  formatDuration,
  formatHours,
  useElapsedTime
} from '@/lib/hooks/use-elapsed-time'
import {
  computeGeneratorStatus,
  computeLifetimeHours
} from '@/lib/hooks/use-generator-status'
import { trpcClient } from '@/data/trpc/react'
import { useLocalUser } from '@/lib/powersync'
import { db } from '@/lib/powersync/database'

import { setPendingSuggestions } from './maintenance-suggestions-store'

export default function GeneratorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const localUser = useLocalUser()
  const foregroundColor = useCSSVariable('--color-foreground') as
    | string
    | undefined
  const mutedColor = useCSSVariable('--color-muted') as string | undefined

  const userId = localUser?.id ?? ''
  const [isSuggesting, setIsSuggesting] = useState(false)

  // Generator data
  const { data: gens } = useDrizzleQuery(
    id ? db.select().from(generators).where(eq(generators.id, id)) : undefined
  )
  const generator = gens[0]

  // Sessions
  const { data: sessions } = useDrizzleQuery(
    id
      ? db
          .select()
          .from(generatorSessions)
          .where(eq(generatorSessions.generatorId, id))
          .orderBy(desc(generatorSessions.startedAt))
      : undefined
  )

  // Maintenance templates
  const { data: templates } = useDrizzleQuery(
    id
      ? db
          .select()
          .from(maintenanceTemplates)
          .where(eq(maintenanceTemplates.generatorId, id))
      : undefined
  )

  // Maintenance records
  const { data: records } = useDrizzleQuery(
    id
      ? db
          .select()
          .from(maintenanceRecords)
          .where(eq(maintenanceRecords.generatorId, id))
          .orderBy(desc(maintenanceRecords.performedAt))
      : undefined
  )

  // Assignments
  const { data: assignments } = useDrizzleQuery(
    id
      ? db
          .select()
          .from(generatorUserAssignments)
          .where(eq(generatorUserAssignments.generatorId, id))
      : undefined
  )

  // Users for display names
  const { data: users } = useDrizzleQuery(db => db.select().from(user))

  // Check if admin
  const { data: allOrgs } = useDrizzleQuery(db =>
    db.select().from(organizations)
  )

  // Org members (for assignment picker)
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

  const statusInfo = generator
    ? computeGeneratorStatus(generator, sessions)
    : null
  const elapsedTime = useElapsedTime(statusInfo?.openSession?.startedAt ?? null)

  if (!generator || !statusInfo) return null

  const org = allOrgs.find(o => o.id === generator.organizationId)
  const isAdmin = org?.adminUserId === userId

  const lifetimeHours = computeLifetimeHours(sessions)

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

  async function handleUnassign(targetUserId: string) {
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

  // Unassigned members (members not yet assigned to this generator)
  const assignedUserIds = new Set(assignments.map(a => a.userId))
  const unassignedMembers = orgMembers.filter(
    m => !assignedUserIds.has(m.userId)
  )

  // Build unified activity feed from sessions + maintenance records
  const activityItems: (
    | {
        type: 'session'
        id: string
        timestamp: string
        startedByUserId: string
        startedAt: string
        stoppedAt: string | null
      }
    | {
        type: 'maintenance'
        id: string
        timestamp: string
        performedByUserId: string
        performedAt: string
        templateName: string
        notes: string | null
      }
  )[] = [
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

  const totalActivityCount = sessions.length + records.length

  function getLastRecordForTemplate(templateId: string) {
    return records.find(r => r.templateId === templateId)
  }

  return (
    <>
      <Stack.Screen options={{ title: generator.title }} />
      <ScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pb-10 pt-4"
      >
        <View className="mx-auto w-full max-w-[600px] gap-6">
          {/* Hero */}
          <View className="items-center gap-3 py-4">
            <GeneratorStatusBadge status={statusInfo.status} size="md" />
            <Text className="text-muted text-center text-[15px]">
              {generator.model}
              {generator.description ? ` · ${generator.description}` : ''}
            </Text>
            <Text className="text-muted text-[13px]">
              {formatHours(lifetimeHours)} lifetime hours
            </Text>
          </View>

          {/* Action Button */}
          {statusInfo.status === 'available' ? (
            <Button
              variant="primary"
              size="lg"
              className="bg-green-600"
              onPress={handleStartSession}
            >
              <Text className="text-lg font-semibold text-white">
                Start Generator
              </Text>
            </Button>
          ) : statusInfo.status === 'running' ? (
            <View className="gap-2">
              <Text className="text-foreground text-center font-mono text-2xl font-bold">
                {elapsedTime}
              </Text>
              <Button
                variant="primary"
                size="lg"
                className="bg-red-600"
                onPress={handleStopSession}
              >
                <Text className="text-lg font-semibold text-white">
                  Stop Generator
                </Text>
              </Button>
            </View>
          ) : (
            <View className="gap-2">
              <Text className="text-center text-sm text-orange-600">
                Resting until{' '}
                {statusInfo.restEndsAt
                  ? format(statusInfo.restEndsAt, 'HH:mm')
                  : ''}
              </Text>
              <Button variant="outline" size="lg" isDisabled>
                Resting...
              </Button>
            </View>
          )}

          {/* Stats */}
          <View className="gap-2">
            <Text className="text-muted ml-4 text-xs uppercase">
              Configuration
            </Text>
            <ListGroup>
              <ListGroup.Item>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Max Run Hours</ListGroup.ItemTitle>
                </ListGroup.ItemContent>
                <Text className="text-foreground text-[15px]">
                  {generator.maxConsecutiveRunHours}h
                </Text>
              </ListGroup.Item>
              <Separator className="mx-4" />
              <ListGroup.Item>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Rest Hours</ListGroup.ItemTitle>
                </ListGroup.ItemContent>
                <Text className="text-foreground text-[15px]">
                  {generator.requiredRestHours}h
                </Text>
              </ListGroup.Item>
              <Separator className="mx-4" />
              <ListGroup.Item>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>Warning Threshold</ListGroup.ItemTitle>
                </ListGroup.ItemContent>
                <Text className="text-foreground text-[15px]">
                  {generator.runWarningThresholdPct}%
                </Text>
              </ListGroup.Item>
            </ListGroup>
          </View>

          {/* Recent Activity */}
          {activityItems.length > 0 ? (
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-muted ml-4 text-xs uppercase">
                  Recent Activity
                </Text>
                {totalActivityCount > 5 ? (
                  <Pressable
                    onPress={() =>
                      router.push(`/generator/activity?generatorId=${id}`)
                    }
                    className="active:opacity-70"
                  >
                    <Text className="text-sm font-medium text-blue-500">
                      View All
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <ListGroup>
                {activityItems.map((item, index) => {
                  if (item.type === 'session') {
                    const duration = item.stoppedAt
                      ? formatDuration(
                          differenceInMilliseconds(
                            parseISO(item.stoppedAt),
                            parseISO(item.startedAt)
                          )
                        )
                      : 'In progress'

                    return (
                      <View key={item.id}>
                        {index > 0 ? <Separator className="mx-4" /> : null}
                        <ListGroup.Item>
                          <ListGroup.ItemContent>
                            <ListGroup.ItemTitle>
                              {format(parseISO(item.startedAt), 'MMM d, HH:mm')}
                            </ListGroup.ItemTitle>
                            <ListGroup.ItemDescription>
                              {getUserName(item.startedByUserId)} · {duration}
                            </ListGroup.ItemDescription>
                          </ListGroup.ItemContent>
                          <Text className="text-muted text-xs">Session</Text>
                        </ListGroup.Item>
                      </View>
                    )
                  }

                  return (
                    <View key={item.id}>
                      {index > 0 ? <Separator className="mx-4" /> : null}
                      <ListGroup.Item>
                        <ListGroup.ItemContent>
                          <ListGroup.ItemTitle>
                            {format(parseISO(item.performedAt), 'MMM d, HH:mm')}
                          </ListGroup.ItemTitle>
                          <ListGroup.ItemDescription>
                            {getUserName(item.performedByUserId)} ·{' '}
                            {item.templateName}
                          </ListGroup.ItemDescription>
                        </ListGroup.ItemContent>
                        <Text className="text-muted text-xs">Maintenance</Text>
                      </ListGroup.Item>
                    </View>
                  )
                })}
              </ListGroup>
            </View>
          ) : null}

          {/* Maintenance Templates */}
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text className="text-muted ml-4 text-xs uppercase">
                Maintenance
              </Text>
              {isAdmin ? (
                <View className="flex-row items-center gap-3">
                  {isSuggesting ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Pressable
                      onPress={handleSuggestMaintenance}
                      className="active:opacity-70"
                    >
                      <SymbolView
                        name="sparkles"
                        size={20}
                        tintColor={foregroundColor}
                      />
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() =>
                      router.push(
                        `/maintenance/create-template?generatorId=${id}`
                      )
                    }
                    className="active:opacity-70"
                  >
                    <SymbolView
                      name="plus.circle.fill"
                      size={22}
                      tintColor={foregroundColor}
                    />
                  </Pressable>
                </View>
              ) : null}
            </View>

            {templates.length === 0 ? (
              <View className="bg-surface-secondary items-center rounded-2xl py-6">
                <Text className="text-muted text-sm">
                  No maintenance templates
                </Text>
              </View>
            ) : (
              <ListGroup>
                {templates.map((template, index) => {
                  const lastRecord = getLastRecordForTemplate(template.id)
                  return (
                    <View key={template.id}>
                      {index > 0 ? <Separator className="mx-4" /> : null}
                      <ListGroup.Item
                        onPress={() =>
                          router.push(
                            `/maintenance/record?templateId=${template.id}&generatorId=${id}`
                          )
                        }
                      >
                        <ListGroup.ItemContent>
                          <ListGroup.ItemTitle>
                            {template.taskName}
                          </ListGroup.ItemTitle>
                          <ListGroup.ItemDescription>
                            {template.isOneTime
                              ? template.triggerType === 'hours'
                                ? `Once at ${template.triggerHoursInterval}h`
                                : template.triggerType === 'calendar'
                                  ? `Once at ${template.triggerCalendarDays} days`
                                  : `Once at ${template.triggerHoursInterval}h or ${template.triggerCalendarDays} days`
                              : template.triggerType === 'hours'
                                ? `Every ${template.triggerHoursInterval}h`
                                : template.triggerType === 'calendar'
                                  ? `Every ${template.triggerCalendarDays} days`
                                  : `${template.triggerHoursInterval}h or ${template.triggerCalendarDays} days`}
                            {lastRecord
                              ? ` · Last: ${format(parseISO(lastRecord.performedAt), 'PP')}`
                              : ' · Never performed'}
                          </ListGroup.ItemDescription>
                        </ListGroup.ItemContent>
                        <ListGroup.ItemSuffix
                          iconProps={{ size: 14, color: mutedColor }}
                        />
                      </ListGroup.Item>
                    </View>
                  )
                })}
              </ListGroup>
            )}
          </View>

          {/* Assigned Employees (Admin only) */}
          {isAdmin ? (
            <View className="gap-2">
              <Text className="text-muted ml-4 text-xs uppercase">
                Assigned Employees
              </Text>
              <ListGroup>
                {assignments.map((assignment, index) => (
                  <View key={assignment.id}>
                    {index > 0 ? <Separator className="mx-4" /> : null}
                    <ListGroup.Item>
                      <ListGroup.ItemPrefix>
                        <SymbolView
                          name="person.fill"
                          size={18}
                          tintColor={foregroundColor}
                        />
                      </ListGroup.ItemPrefix>
                      <ListGroup.ItemContent>
                        <ListGroup.ItemTitle>
                          {getUserName(assignment.userId)}
                        </ListGroup.ItemTitle>
                      </ListGroup.ItemContent>
                      <Pressable
                        onPress={() => handleUnassign(assignment.userId)}
                      >
                        <Text className="text-danger text-sm">Remove</Text>
                      </Pressable>
                    </ListGroup.Item>
                  </View>
                ))}
                {assignments.length === 0 ? (
                  <ListGroup.Item>
                    <ListGroup.ItemContent>
                      <ListGroup.ItemTitle className="text-muted">
                        No employees assigned
                      </ListGroup.ItemTitle>
                    </ListGroup.ItemContent>
                  </ListGroup.Item>
                ) : null}
                {unassignedMembers.length > 0 ? (
                  <>
                    <Separator className="mx-4" />
                    {unassignedMembers.map(member => (
                      <View key={member.id}>
                        <ListGroup.Item
                          onPress={() => handleAssign(member.userId)}
                        >
                          <ListGroup.ItemPrefix>
                            <SymbolView
                              name="plus.circle"
                              size={18}
                              tintColor={foregroundColor}
                            />
                          </ListGroup.ItemPrefix>
                          <ListGroup.ItemContent>
                            <ListGroup.ItemTitle>
                              {getUserName(member.userId)}
                            </ListGroup.ItemTitle>
                          </ListGroup.ItemContent>
                        </ListGroup.Item>
                      </View>
                    ))}
                  </>
                ) : null}
              </ListGroup>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </>
  )
}
