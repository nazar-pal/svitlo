import { differenceInMilliseconds, format, parseISO } from 'date-fns'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import {
  Button,
  Chip,
  ListGroup,
  Separator,
  Tabs,
  useThemeColor
} from 'heroui-native'
import { useRef, useState } from 'react'
import { Alert, FlatList, Text, View } from 'react-native'
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'

import { SwipeableRow } from './components/swipeable-row'
import type { GeneratorSession } from '@/data/client/db-schema/generators'
import type { MaintenanceRecord } from '@/data/client/db-schema/maintenance'
import { deleteMaintenanceRecord, deleteSession } from '@/data/client/mutations'
import {
  getAllOrganizations,
  getAllUsers,
  getGenerator,
  getGeneratorSessions,
  getMaintenanceRecords,
  getMaintenanceTemplateSummaries
} from '@/data/client/queries'
import { getUserName } from '@/lib/utils/get-user-name'
import { formatDuration } from '@/lib/utils/time'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

const FILTERS = ['all', 'sessions', 'maintenance'] as const
type Filter = (typeof FILTERS)[number]

const FILTER_LABELS: Record<Filter, string> = {
  all: 'All',
  sessions: 'Runs',
  maintenance: 'Maintenance'
}

type ActivityListItem =
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
): ActivityListItem[] {
  const templateMap = new Map(templates.map(t => [t.id, t.taskName]))

  const items: ActivityListItem[] = []

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
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const openRowRef = useRef<SwipeableMethods | null>(null)
  const localUser = useLocalUser()
  const [mutedColor, successColor] = useThemeColor(['muted', 'success'])

  const userId = localUser?.id ?? ''

  const { data: sessions } = useDrizzleQuery(
    generatorId ? getGeneratorSessions(generatorId) : undefined
  )

  const { data: records } = useDrizzleQuery(
    generatorId ? getMaintenanceRecords(generatorId) : undefined
  )

  const { data: templates } = useDrizzleQuery(
    generatorId ? getMaintenanceTemplateSummaries(generatorId) : undefined
  )

  const { data: users } = useDrizzleQuery(getAllUsers())

  const { data: gens } = useDrizzleQuery(
    generatorId ? getGenerator(generatorId) : undefined
  )
  const generator = gens[0]

  const { data: allOrgs } = useDrizzleQuery(getAllOrganizations())

  const org = generator
    ? allOrgs.find(o => o.id === generator.organizationId)
    : undefined
  const isAdmin = org?.adminUserId === userId

  const resolveUserName = (uid: string) => getUserName(users, uid)

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
      <Stack.Screen
        options={{
          title: 'Activity',
          headerRight: () => (
            <Button
              size="sm"
              variant="ghost"
              onPress={() =>
                router.push(`/generator/log-session?generatorId=${generatorId}`)
              }
            >
              Log Past Run
            </Button>
          )
        }}
      />
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
                      tintColor={isInProgress ? successColor : mutedColor}
                    />
                  </View>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>
                      {format(parseISO(session.startedAt), 'MMM d, HH:mm')}
                    </ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {resolveUserName(session.startedByUserId)} · {duration}
                    </ListGroup.ItemDescription>
                  </ListGroup.ItemContent>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={isInProgress ? 'success' : undefined}
                  >
                    {isInProgress ? 'Active' : 'Session'}
                  </Chip>
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
                    {resolveUserName(record.performedByUserId)} · {templateName}
                    {record.notes ? ` · ${record.notes}` : ''}
                  </ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <Chip size="sm" variant="soft">
                  Maintenance
                </Chip>
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
    <View className="mb-3">
      <Tabs value={filter} onValueChange={v => onFilterChange(v as Filter)}>
        <Tabs.List>
          <Tabs.Indicator />
          {FILTERS.map(f => (
            <Tabs.Trigger key={f} value={f}>
              <Tabs.Label>{FILTER_LABELS[f]}</Tabs.Label>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>
    </View>
  )
}
