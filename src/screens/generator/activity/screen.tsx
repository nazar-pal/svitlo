import { differenceInMilliseconds, parseISO } from 'date-fns'
import { Stack, useRouter } from 'expo-router'
import { SymbolView } from 'expo-symbols'
import { Chip, ListGroup, Separator, Tabs, useThemeColor } from 'heroui-native'
import { useRef, useState } from 'react'
import { Text, View } from 'react-native'
import type { SwipeableRowRef } from '@/components/swipeable-row'
import Animated, { LinearTransition } from 'react-native-reanimated'

import { formatDate, useTranslation } from '@/lib/i18n'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import {
  getAllUsers,
  getGeneratorSessions,
  getMaintenanceRecords,
  getMaintenanceTemplateSummaries
} from '@/data/client/queries'
import { confirmDeleteRecord, confirmDeleteSession } from '@/lib/alerts'
import { type Filter, FILTERS, filterLabel } from '@/lib/activity-filters'
import { selection } from '@/lib/haptics'
import { useAuthedParams } from '@/lib/hooks/use-authed-params'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { getUserName } from '@/lib/utils/get-user-name'
import { formatDuration } from '@/lib/utils/time'
import { SwipeableRow } from '@/components/swipeable-row'

import { buildActivityItems } from './lib/build-generator-activity-items'

const ItemSeparator = () => <Separator className="mx-4" />

export default function ActivityScreen() {
  const { t } = useTranslation()
  const router = useRouter()
  const ctx = useAuthedParams(['id'])
  const [filter, setFilter] = useState<Filter>('all')
  const openRowRef = useRef<SwipeableRowRef | null>(null)
  const [mutedColor, successColor, warningColor] = useThemeColor([
    'muted',
    'success',
    'warning'
  ])

  const { data: sessions } = useDrizzleQuery(
    ctx ? getGeneratorSessions(ctx.params.id) : undefined
  )

  const { data: records } = useDrizzleQuery(
    ctx ? getMaintenanceRecords(ctx.params.id) : undefined
  )

  const { data: templates } = useDrizzleQuery(
    ctx ? getMaintenanceTemplateSummaries(ctx.params.id) : undefined
  )

  const { data: users } = useDrizzleQuery(getAllUsers())

  if (!ctx) return null
  const {
    userId,
    params: { id: generatorId }
  } = ctx

  const resolveUserName = (uid: string) => getUserName(users, uid)

  const items = buildActivityItems(sessions, records, templates, filter)

  return (
    <>
      <Stack.Screen
        options={{
          title: t('tabs.activity'),
          headerRight: () => (
            <HeaderSubmitButton
              systemImage="plus"
              onPress={() =>
                router.push(`/generator/${generatorId}/log-session`)
              }
            />
          )
        }}
      />
      <Animated.FlatList
        data={items}
        contentInsetAdjustmentBehavior="automatic"
        onScrollBeginDrag={() => openRowRef.current?.close()}
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
            <Text className="text-muted text-sm">
              {t('activity.noActivityRecorded')}
            </Text>
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
              : t('activity.inProgress')

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
                      {formatDate(
                        parseISO(session.startedAt),
                        t('formats.dateTimeShort')
                      )}
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
                    {isInProgress ? t('activity.active') : t('activity.run')}
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
                    {formatDate(
                      parseISO(record.performedAt),
                      t('formats.dateTimeShort')
                    )}
                  </ListGroup.ItemTitle>
                  <ListGroup.ItemDescription>
                    {resolveUserName(record.performedByUserId)} · {templateName}
                    {record.notes ? ` · ${record.notes}` : ''}
                  </ListGroup.ItemDescription>
                </ListGroup.ItemContent>
                <Chip size="sm" variant="soft" color="warning">
                  {t('activity.maintenance')}
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
              <Tabs.Label>{filterLabel(f)}</Tabs.Label>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>
    </View>
  )
}
