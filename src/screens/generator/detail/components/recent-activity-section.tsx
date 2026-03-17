import { differenceInMilliseconds, format, parseISO } from 'date-fns'
import { Button, Chip, ListGroup, Separator, Surface } from 'heroui-native'
import { Text, View } from 'react-native'

import { SectionHeader } from '@/components/section-header'

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
        <SectionHeader title="Recent Activity" />
        <Button size="sm" variant="ghost" onPress={onViewAll}>
          View All
        </Button>
      </View>
      {items.length === 0 ? (
        <Surface variant="secondary" className="items-center py-6">
          <Text className="text-muted text-sm">No activity recorded</Text>
        </Surface>
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
      <Chip size="sm" variant="soft">
        Session
      </Chip>
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
      <Chip size="sm" variant="soft">
        Maintenance
      </Chip>
    </ListGroup.Item>
  )
}
