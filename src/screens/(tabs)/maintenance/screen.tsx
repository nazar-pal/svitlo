import { SymbolView } from 'expo-symbols'
import {
  Button,
  PressableFeedback,
  Surface,
  useThemeColor
} from 'heroui-native'
import { Stack, useRouter } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'

import { EmptyState } from '@/components/empty-state'
import { GeneratorScopeMenu } from '@/components/generator-scope-menu'
import { SectionHeader } from '@/components/section-header'
import {
  formatMaintenanceLabel,
  type MaintenanceItemInfo
} from '@/lib/maintenance/due'

import type { Generator } from '@/data/client/db-schema'
import { useMaintenanceTabData } from './lib/use-maintenance-tab-data'

export default function MaintenanceScreen() {
  const router = useRouter()
  const {
    userOrgs,
    admin,
    availableGenerators,
    effectiveScope,
    setGeneratorScope,
    overdue,
    dueSoon,
    upcoming,
    isEmpty,
    generatorsById
  } = useMaintenanceTabData()

  if (userOrgs.length === 0)
    return (
      <View className="bg-background flex-1 items-center justify-center px-5 pb-10">
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState
          icon="building.2"
          title="No Organizations"
          description="Create an organization or accept an invitation to get started."
          actionLabel="Go to Members"
          onAction={() => router.push('/members')}
        />
      </View>
    )

  const headerRight = () => (
    <GeneratorScopeMenu
      admin={admin}
      availableGenerators={availableGenerators}
      effectiveScope={effectiveScope}
      onSelect={setGeneratorScope}
    />
  )

  if (isEmpty)
    return (
      <>
        <Stack.Screen options={{ headerShown: true, headerRight }} />
        <View className="bg-background flex-1 items-center justify-center px-5 pb-10">
          <EmptyState
            icon="wrench"
            title="No Maintenance"
            description="Add maintenance templates to your generators to track service schedules."
          />
        </View>
      </>
    )

  return (
    <>
      <Stack.Screen options={{ headerShown: true, headerRight }} />
      <ScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pb-10 pt-4"
      >
        <View className="mx-auto w-full max-w-150">
          {[
            { title: 'Overdue', items: overdue },
            { title: 'Due Soon', items: dueSoon },
            { title: 'Upcoming', items: upcoming }
          ].map(({ title, items }) =>
            items.length > 0 ? (
              <View key={title} className="mb-6">
                <SectionHeader title={title} />
                <View className="mt-1 gap-3">
                  {items.map(item => (
                    <MaintenanceListItem
                      key={item.templateId}
                      item={item}
                      generator={generatorsById.get(item.generatorId)}
                      onPress={() =>
                        router.push(`/generator/${item.generatorId}`)
                      }
                      onRecord={() =>
                        router.push(
                          `/maintenance/record?templateId=${item.templateId}&generatorId=${item.generatorId}`
                        )
                      }
                    />
                  ))}
                </View>
              </View>
            ) : null
          )}
        </View>
      </ScrollView>
    </>
  )
}

function MaintenanceListItem({
  item,
  generator,
  onPress,
  onRecord
}: {
  item: MaintenanceItemInfo
  generator: Generator | undefined
  onPress: () => void
  onRecord: () => void
}) {
  const [mutedColor, dangerColor, warningColor] = useThemeColor([
    'muted',
    'danger',
    'warning'
  ])

  const { urgency } = item

  const iconColor =
    urgency === 'overdue'
      ? dangerColor
      : urgency === 'due_soon'
        ? warningColor
        : mutedColor

  const iconBgClass =
    urgency === 'overdue'
      ? 'bg-danger/15'
      : urgency === 'due_soon'
        ? 'bg-warning/15'
        : 'bg-default'

  const statusText = formatMaintenanceLabel(item)

  const statusColorClass =
    urgency === 'overdue'
      ? 'text-danger'
      : urgency === 'due_soon'
        ? 'text-warning'
        : 'text-muted'

  return (
    <PressableFeedback onPress={onPress}>
      <Surface variant="secondary">
        <View className="flex-row items-center gap-3">
          <View
            className={`${iconBgClass} size-10 items-center justify-center rounded-xl`}
          >
            <SymbolView name="wrench.fill" size={20} tintColor={iconColor} />
          </View>

          <View className="flex-1 gap-1">
            <Text
              className="text-foreground text-4.25 font-semibold"
              numberOfLines={1}
            >
              {item.taskName}
            </Text>
            <Text className="text-muted text-3.25" numberOfLines={1}>
              {generator?.title ?? 'Unknown generator'}
              {' · '}
              <Text className={statusColorClass}>{statusText}</Text>
            </Text>
          </View>

          {urgency !== 'ok' ? (
            <Button
              variant={urgency === 'overdue' ? 'primary' : 'outline'}
              size="sm"
              onPress={onRecord}
            >
              Record
            </Button>
          ) : (
            <SymbolView name="chevron.right" size={14} tintColor={mutedColor} />
          )}
        </View>
      </Surface>
    </PressableFeedback>
  )
}
