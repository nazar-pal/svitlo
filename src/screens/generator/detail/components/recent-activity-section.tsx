import { differenceInMilliseconds, format, parseISO } from 'date-fns'
import { Pressable, Text, View } from 'react-native'
import { ListGroup, Separator } from 'heroui-native'

import type {
  ActivityItem,
  MaintenanceActivity,
  SessionActivity
} from '@/lib/generator/activity-item'
import { formatDuration } from '@/lib/utils/time'

interface RecentActivitySectionProps {
  items: ActivityItem[]
  getUserName: (userId: string) => string
  onViewAll: () => void
}

export function RecentActivitySection({
  items,
  getUserName,
  onViewAll
}: RecentActivitySectionProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-muted ml-4 text-xs uppercase">
          Recent Activity
        </Text>
        <Pressable onPress={onViewAll} className="active:opacity-70">
          <Text className="text-sm font-medium text-blue-500">View All</Text>
        </Pressable>
      </View>
      {items.length === 0 ? (
        <View className="bg-surface-secondary items-center rounded-2xl py-6">
          <Text className="text-muted text-sm">No activity recorded</Text>
        </View>
      ) : (
        <ListGroup>
          {items.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <Separator className="mx-4" /> : null}
              {item.type === 'session' ? (
                <SessionItem item={item} getUserName={getUserName} />
              ) : (
                <MaintenanceItem item={item} getUserName={getUserName} />
              )}
            </View>
          ))}
        </ListGroup>
      )}
    </View>
  )
}

function SessionItem({
  item,
  getUserName
}: {
  item: SessionActivity
  getUserName: (userId: string) => string
}) {
  const duration = item.stoppedAt
    ? formatDuration(
        differenceInMilliseconds(
          parseISO(item.stoppedAt),
          parseISO(item.startedAt)
        )
      )
    : 'In progress'

  return (
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
  )
}

function MaintenanceItem({
  item,
  getUserName
}: {
  item: MaintenanceActivity
  getUserName: (userId: string) => string
}) {
  return (
    <ListGroup.Item>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>
          {format(parseISO(item.performedAt), 'MMM d, HH:mm')}
        </ListGroup.ItemTitle>
        <ListGroup.ItemDescription>
          {getUserName(item.performedByUserId)} · {item.templateName}
        </ListGroup.ItemDescription>
      </ListGroup.ItemContent>
      <Text className="text-muted text-xs">Maintenance</Text>
    </ListGroup.Item>
  )
}
