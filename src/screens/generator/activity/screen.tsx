import { differenceInMilliseconds, format, parseISO } from 'date-fns'
import { desc, eq } from 'drizzle-orm'
import { Stack, useLocalSearchParams } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { ListGroup, Separator } from 'heroui-native'
import { useRef, useState } from 'react'
import { Alert, FlatList, Pressable, Text, View } from 'react-native'
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import { useCSSVariable } from 'uniwind'

import { SwipeableRow } from '@/components/swipeable-row'
import {
  generators,
  generatorSessions,
  maintenanceRecords,
  maintenanceTemplates,
  organizations,
  user
} from '@/data/client/db-schema'
import type { GeneratorSession } from '@/data/client/db-schema/generators'
import type { MaintenanceRecord } from '@/data/client/db-schema/maintenance'
import { deleteMaintenanceRecord, deleteSession } from '@/data/client/mutations'
import { formatDuration } from '@/lib/hooks/use-elapsed-time'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'
import { db } from '@/lib/powersync/database'

const FILTERS = ['all', 'sessions', 'maintenance'] as const
type Filter = (typeof FILTERS)[number]

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  sessions: 'Runs',
  maintenance: 'Maintenance'
}

type ActivityItem =
  | {
      type: 'session'
      id: string
      timestamp: string
      session: GeneratorSession
    }
  | {
      type: 'maintenance'
      id: string
      timestamp: string
      record: MaintenanceRecord
      templateName: string
    }

function buildActivityItems(
  sessions: GeneratorSession[],
  records: MaintenanceRecord[],
  templates: { id: string; taskName: string }[],
  filter: Filter
): ActivityItem[] {
  const templateMap = new Map(templates.map(t => [t.id, t.taskName]))

  const items: ActivityItem[] = []

  if (filter !== 'maintenance')
    for (const session of sessions)
      items.push({
        type: 'session',
        id: session.id,
        timestamp: session.startedAt,
        session
      })

  if (filter !== 'sessions')
    for (const record of records)
      items.push({
        type: 'maintenance',
        id: record.id,
        timestamp: record.performedAt,
        record,
        templateName: templateMap.get(record.templateId) ?? 'Unknown task'
      })

  items.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  return items
}

export default function ActivityScreen() {
  const { generatorId } = useLocalSearchParams<{ generatorId: string }>()
  const [filter, setFilter] = useState<Filter>('all')
  const openRowRef = useRef<SwipeableMethods | null>(null)
  const localUser = useLocalUser()
  const mutedColor = useCSSVariable('--color-muted') as string | undefined

  const userId = localUser?.id ?? ''

  const { data: sessions } = useDrizzleQuery(
    generatorId
      ? db
          .select()
          .from(generatorSessions)
          .where(eq(generatorSessions.generatorId, generatorId))
          .orderBy(desc(generatorSessions.startedAt))
      : undefined
  )

  const { data: records } = useDrizzleQuery(
    generatorId
      ? db
          .select()
          .from(maintenanceRecords)
          .where(eq(maintenanceRecords.generatorId, generatorId))
          .orderBy(desc(maintenanceRecords.performedAt))
      : undefined
  )

  const { data: templates } = useDrizzleQuery(
    generatorId
      ? db
          .select({
            id: maintenanceTemplates.id,
            taskName: maintenanceTemplates.taskName
          })
          .from(maintenanceTemplates)
          .where(eq(maintenanceTemplates.generatorId, generatorId))
      : undefined
  )

  const { data: users } = useDrizzleQuery(db => db.select().from(user))

  const { data: gens } = useDrizzleQuery(
    generatorId
      ? db.select().from(generators).where(eq(generators.id, generatorId))
      : undefined
  )
  const generator = gens[0]

  const { data: allOrgs } = useDrizzleQuery(db =>
    db.select().from(organizations)
  )

  const org = generator
    ? allOrgs.find(o => o.id === generator.organizationId)
    : undefined
  const isAdmin = org?.adminUserId === userId

  function getUserName(uid: string): string {
    return users.find(u => u.id === uid)?.name || 'Unknown'
  }

  function canDeleteSession(session: GeneratorSession): boolean {
    if (!session.stoppedAt) return false
    if (isAdmin) return true
    return session.startedByUserId === userId
  }

  function canDeleteRecord(record: MaintenanceRecord): boolean {
    if (isAdmin) return true
    return record.performedByUserId === userId
  }

  function handleDeleteSession(sessionId: string) {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteSession(userId, sessionId)
            if (!result.ok) Alert.alert('Error', result.error)
          }
        }
      ]
    )
  }

  function handleDeleteRecord(recordId: string) {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this maintenance record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteMaintenanceRecord(userId, recordId)
            if (!result.ok) Alert.alert('Error', result.error)
          }
        }
      ]
    )
  }

  const items = buildActivityItems(sessions, records, templates, filter)

  return (
    <>
      <Stack.Screen options={{ title: 'Activity' }} />
      <FlatList
        data={items}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          paddingTop: 8
        }}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Separator className="mx-4" />}
        ListHeaderComponent={
          <FilterBar filter={filter} onFilterChange={setFilter} />
        }
        ListEmptyComponent={
          <View className="items-center pt-8">
            <Text className="text-muted text-sm">No activity recorded</Text>
          </View>
        }
        renderItem={({ item }) => {
          if (item.type === 'session') {
            const { session } = item
            const isInProgress = !session.stoppedAt
            const duration = session.stoppedAt
              ? formatDuration(
                  differenceInMilliseconds(
                    parseISO(session.stoppedAt),
                    parseISO(session.startedAt)
                  )
                )
              : 'In progress'

            return (
              <SwipeableRow
                onDelete={
                  canDeleteSession(session)
                    ? () => handleDeleteSession(session.id)
                    : undefined
                }
                openRowRef={openRowRef}
              >
                <ListGroup.Item>
                  <View className="mr-3 items-center justify-center">
                    <SymbolView
                      name="bolt.fill"
                      size={16}
                      tintColor={isInProgress ? '#22c55e' : mutedColor}
                    />
                  </View>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>
                      {format(parseISO(session.startedAt), 'MMM d, HH:mm')}
                    </ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {getUserName(session.startedByUserId)} · {duration}
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <Text
                    className={`text-xs font-medium ${isInProgress ? 'text-green-500' : 'text-muted'}`}
                  >
                    {isInProgress ? 'Active' : 'Session'}
                  </Text>
                </ListGroup.Item>
              </SwipeableRow>
            )
          }

          const { record, templateName } = item
          return (
            <SwipeableRow
              onDelete={
                canDeleteRecord(record)
                  ? () => handleDeleteRecord(record.id)
                  : undefined
              }
              openRowRef={openRowRef}
            >
              <ListGroup.Item>
                <View className="mr-3 items-center justify-center">
                  <SymbolView
                    name="wrench.fill"
                    size={16}
                    tintColor={mutedColor}
                  />
                </View>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>
                    {format(parseISO(record.performedAt), 'MMM d, HH:mm')}
                  </ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    {getUserName(record.performedByUserId)} · {templateName}
                    {record.notes ? ` · ${record.notes}` : ''}
                  </ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <Text className="text-muted text-xs font-medium">
                  Maintenance
                </Text>
              </ListGroup.Item>
            </SwipeableRow>
          )
        }}
      />
    </>
  )
}

function FilterBar({
  filter,
  onFilterChange
}: {
  filter: Filter
  onFilterChange: (f: Filter) => void
}) {
  return (
    <View className="bg-surface-secondary mb-3 flex-row rounded-xl p-1">
      {FILTERS.map(f => (
        <Pressable
          key={f}
          onPress={() => onFilterChange(f)}
          className={`flex-1 items-center rounded-lg py-2 ${filter === f ? 'bg-background' : ''}`}
        >
          <Text
            className={`text-sm font-medium ${filter === f ? 'text-foreground' : 'text-muted'}`}
          >
            {FILTER_LABELS[f]}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}
