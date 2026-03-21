import { differenceInMilliseconds, parseISO } from 'date-fns'
import { Button, Chip, ListGroup, Separator, Surface } from 'heroui-native'
import { Text, View } from 'react-native'

import { SectionHeader } from '@/components/section-header'
import { formatDate, useTranslation } from '@/lib/i18n'

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
  const { t } = useTranslation()

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <SectionHeader title={t('activity.recentActivity')} />
        <Button size="sm" variant="ghost" onPress={onViewAll}>
          {t('activity.viewAll')}
        </Button>
      </View>
      {items.length === 0 ? (
        <Surface variant="secondary" className="items-center py-6">
          <Text className="text-muted text-sm">
            {t('activity.noActivityRecorded')}
          </Text>
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
  const { t } = useTranslation()
  const duration = item.stoppedAt
    ? formatDuration(
        differenceInMilliseconds(
          parseISO(item.stoppedAt),
          parseISO(item.startedAt)
        )
      )
    : t('activity.inProgress')

  return (
    <ListGroup.Item>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>
          {formatDate(parseISO(item.startedAt), t('formats.dateTimeShort'))}
        </ListGroup.ItemTitle>
        <ListGroup.ItemDescription>
          {getUserName(item.startedByUserId)} · {duration}
        </ListGroup.ItemDescription>
      </ListGroup.ItemContent>
      <Chip size="sm" variant="soft">
        {t('activity.session')}
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
  const { t } = useTranslation()

  return (
    <ListGroup.Item>
      <ListGroup.ItemContent>
        <ListGroup.ItemTitle>
          {formatDate(parseISO(item.performedAt), t('formats.dateTimeShort'))}
        </ListGroup.ItemTitle>
        <ListGroup.ItemDescription>
          {getUserName(item.performedByUserId)} · {item.templateName}
        </ListGroup.ItemDescription>
      </ListGroup.ItemContent>
      <Chip size="sm" variant="soft">
        {t('activity.maintenance')}
      </Chip>
    </ListGroup.Item>
  )
}
