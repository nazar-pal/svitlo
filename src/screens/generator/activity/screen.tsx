import { differenceInMilliseconds, format, parseISO } from 'date-fns'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { Chip, ListGroup, Separator, Tabs, useThemeColor } from 'heroui-native'
import { useRef, useState } from 'react'
import { Text, View } from 'react-native'
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable'
import Animated, { LinearTransition } from 'react-native-reanimated'

import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import type { GeneratorSession } from '@/data/client/db-schema/generators'
import type { MaintenanceRecord } from '@/data/client/db-schema/maintenance'
import {
  getAllUsers,
  getGeneratorSessions,
  getMaintenanceRecords,
  getMaintenanceTemplateSummaries
} from '@/data/client/queries'
import {
  confirmDeleteRecord,
  confirmDeleteSession
} from '@/lib/activity/confirm-delete'
import { type Filter, FILTERS, FILTER_LABELS } from '@/lib/activity'
import { selection } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'
import { getUserName } from '@/lib/utils/get-user-name'
import { formatDuration } from '@/lib/utils/time'
import { SwipeableRow } from '@/components/swipeable-row'

const ItemSeparator = () => <Separator className="mx-4" />

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
  const [mutedColor, successColor, warningColor] = useThemeColor([
    'muted',
    'success',
    'warning'
  ])

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

  const resolveUserName = (uid: string) => getUserName(users, uid)

  const items = buildActivityItems(sessions, records, templates, filter)

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Activity',
          headerRight: () => (
            <HeaderSubmitButton
              systemImage="plus"
              onPress={() =>
                router.push(`/generator/log-session?generatorId=${generatorId}`)
              }
            />
          )
        }}
      />
      <Animated.FlatList
        data={items}
        contentInsetAdjustmentBehavior="automatic"
        itemLayoutAnimation={LinearTransition}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 40,
          paddingTop: 8
        }}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={ItemSeparator}
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
            const canEdit = !isInProgress
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
                  canEdit
                    ? () => confirmDeleteSession(userId, session.id)
                    : undefined
                }
                openRowRef={openRowRef}
              >
                <ListGroup.Item
                  onPress={
                    canEdit
                      ? () => {
                          openRowRef.current?.close()
                          router.push(
                            `/activity/edit-session?sessionId=${session.id}`
                          )
                        }
                      : undefined
                  }
                >
                  <ListGroup.ItemPrefix>
                    <SymbolView
                      name="bolt.fill"
                      size={16}
                      tintColor={isInProgress ? successColor : mutedColor}
                    />
                  </ListGroup.ItemPrefix>
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
                    {isInProgress ? 'Active' : 'Run'}
                  </Chip>
                </ListGroup.Item>
              </SwipeableRow>
            )
          }

          const { record, templateName } = item
          return (
            <SwipeableRow
              onDelete={() => confirmDeleteRecord(userId, record.id)}
              openRowRef={openRowRef}
            >
              <ListGroup.Item
                onPress={() => {
                  openRowRef.current?.close()
                  router.push(
                    `/activity/edit-maintenance?recordId=${record.id}`
                  )
                }}
              >
                <ListGroup.ItemPrefix>
                  <SymbolView
                    name="wrench.fill"
                    size={16}
                    tintColor={warningColor}
                  />
                </ListGroup.ItemPrefix>
                <ListGroup.ItemContent>
                  <ListGroup.ItemTitle>
                    {format(parseISO(record.performedAt), 'MMM d, HH:mm')}
                  </ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    {resolveUserName(record.performedByUserId)} · {templateName}
                    {record.notes ? ` · ${record.notes}` : ''}
                  </ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <Chip size="sm" variant="soft" color="warning">
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
      <Tabs
        value={filter}
        onValueChange={v => {
          selection()
          onFilterChange(v as Filter)
        }}
      >
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
