import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { font, labelStyle } from '@expo/ui/swift-ui/modifiers'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { parseISO } from 'date-fns'
import { SymbolView } from 'expo-symbols'
import { ScrollView, Text, View } from 'react-native'
import {
  Button,
  ListGroup,
  Separator,
  Surface,
  useThemeColor
} from 'heroui-native'

import { confirmDeleteTemplate } from '@/lib/alerts'
import {
  getGenerator,
  getGeneratorSessions,
  getMaintenanceRecords,
  getMaintenanceTemplate
} from '@/data/client/queries'
import { formatDate, useTranslation } from '@/lib/i18n'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import {
  computeAllMaintenanceItems,
  formatMaintenanceLabel
} from '@/lib/maintenance/due'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'

export default function TemplateDetailsScreen() {
  const { t } = useTranslation()
  const { id: generatorId, templateId } = useLocalSearchParams<{
    id: string
    templateId: string
  }>()
  const router = useRouter()
  const { isAdmin, userId } = useUserOrgs()
  const [mutedColor, dangerColor, warningColor, successColor] = useThemeColor([
    'muted',
    'danger',
    'warning',
    'success'
  ])

  const { data: templateData } = useDrizzleQuery(
    templateId ? getMaintenanceTemplate(templateId) : undefined
  )
  const template = templateData[0]

  const { data: generatorData } = useDrizzleQuery(
    generatorId ? getGenerator(generatorId) : undefined
  )
  const generator = generatorData[0]

  const { data: records } = useDrizzleQuery(
    generatorId ? getMaintenanceRecords(generatorId) : undefined
  )

  const { data: sessions } = useDrizzleQuery(
    generatorId ? getGeneratorSessions(generatorId) : undefined
  )

  if (!template || !generator) return null

  const adminUser = isAdmin(generator.organizationId)

  const itemInfo = computeAllMaintenanceItems([template], records, sessions)[0]
  const lastRecord = records
    .filter(r => r.templateId === template.id)
    .sort(
      (a, b) =>
        parseISO(b.performedAt).getTime() - parseISO(a.performedAt).getTime()
    )[0]

  const isOneTimeDone = template.isOneTime && !!lastRecord

  const scheduleLabel = template.isOneTime
    ? template.triggerType === 'hours'
      ? t('maintenanceTemplate.onceAtHours', {
          hours: String(template.triggerHoursInterval)
        })
      : template.triggerType === 'calendar'
        ? t('maintenanceTemplate.onceAtDays', {
            days: String(template.triggerCalendarDays)
          })
        : t('maintenanceTemplate.onceAtBoth', {
            hours: String(template.triggerHoursInterval),
            days: String(template.triggerCalendarDays)
          })
    : template.triggerType === 'hours'
      ? t('maintenanceTemplate.everyHours', {
          hours: String(template.triggerHoursInterval)
        })
      : template.triggerType === 'calendar'
        ? t('maintenanceTemplate.everyDays', {
            days: String(template.triggerCalendarDays)
          })
        : t('maintenanceTemplate.everyBoth', {
            hours: String(template.triggerHoursInterval),
            days: String(template.triggerCalendarDays)
          })

  const urgencyColor = !itemInfo
    ? mutedColor
    : itemInfo.urgency === 'overdue'
      ? dangerColor
      : itemInfo.urgency === 'due_soon'
        ? warningColor
        : mutedColor

  const urgencyTextClass = !itemInfo
    ? 'text-muted'
    : itemInfo.urgency === 'overdue'
      ? 'text-danger'
      : itemInfo.urgency === 'due_soon'
        ? 'text-warning'
        : 'text-muted'

  const urgencyBgClass = !itemInfo
    ? 'bg-default'
    : itemInfo.urgency === 'overdue'
      ? 'bg-danger/15'
      : itemInfo.urgency === 'due_soon'
        ? 'bg-warning/15'
        : 'bg-default'

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pt-6 pb-6"
    >
      <Stack.Screen
        options={{
          title: template.taskName,
          headerRight: adminUser
            ? () => (
                <Host matchContents>
                  <SwiftButton
                    label={t('screens.editTask')}
                    systemImage="pencil"
                    onPress={() =>
                      router.push(
                        `/generator/${generatorId}/edit-template?templateId=${templateId}`
                      )
                    }
                    modifiers={[labelStyle('iconOnly'), font({ size: 20 })]}
                  />
                </Host>
              )
            : undefined
        }}
      />

      <View className="mx-auto w-full max-w-150 gap-7">
        {/* Urgency Status */}
        {isOneTimeDone && lastRecord ? (
          <Surface variant="secondary" className="flex-row items-center gap-3">
            <View className="bg-success/15 size-10 items-center justify-center rounded-xl">
              <SymbolView
                name="checkmark.circle.fill"
                size={20}
                tintColor={successColor}
              />
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-sm font-medium">
                {t('maintenanceTemplate.completed')}
              </Text>
              <Text className="text-success text-sm">
                {formatDate(parseISO(lastRecord.performedAt), 'PPp')}
              </Text>
            </View>
          </Surface>
        ) : itemInfo ? (
          <Surface variant="secondary" className="flex-row items-center gap-3">
            <View
              className={`${urgencyBgClass} size-10 items-center justify-center rounded-xl`}
            >
              <SymbolView
                name="clock.fill"
                size={20}
                tintColor={urgencyColor}
              />
            </View>
            <View className="flex-1">
              <Text className="text-foreground text-sm font-medium">
                {t('maintenanceTemplate.nextDue')}
              </Text>
              <Text className={`text-sm ${urgencyTextClass}`}>
                {formatMaintenanceLabel(itemInfo)}
              </Text>
            </View>
          </Surface>
        ) : null}

        {/* Description / Instructions */}
        {template.description ? (
          <View className="gap-2">
            <Text className="text-muted text-xs font-medium uppercase">
              {t('maintenanceTemplate.instructions')}
            </Text>
            <Surface variant="secondary">
              <Text className="text-foreground text-sm leading-5.5">
                {template.description}
              </Text>
            </Surface>
          </View>
        ) : null}

        {/* Schedule & Last Performed */}
        <View className="gap-2">
          <Text className="text-muted text-xs font-medium uppercase">
            {t('maintenanceTemplate.schedule')}
          </Text>
          <ListGroup>
            <ListGroup.Item>
              <ListGroup.ItemPrefix>
                <SymbolView name="repeat" size={18} tintColor={mutedColor} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>{scheduleLabel}</ListGroup.ItemTitle>
              </ListGroup.ItemContent>
            </ListGroup.Item>
            <Separator className="mx-4" />
            <ListGroup.Item>
              <ListGroup.ItemPrefix>
                <SymbolView name="calendar" size={18} tintColor={mutedColor} />
              </ListGroup.ItemPrefix>
              <ListGroup.ItemContent>
                <ListGroup.ItemTitle>
                  {t('maintenanceTemplate.lastPerformed')}
                </ListGroup.ItemTitle>
                <ListGroup.ItemDescription>
                  {lastRecord
                    ? formatDate(parseISO(lastRecord.performedAt), 'PPp')
                    : t('maintenanceTemplate.neverPerformed')}
                </ListGroup.ItemDescription>
              </ListGroup.ItemContent>
            </ListGroup.Item>
          </ListGroup>
        </View>

        {/* Record Maintenance Button */}
        {!isOneTimeDone ? (
          <Button
            size="lg"
            onPress={() =>
              router.push(
                `/generator/${generatorId}/record-maintenance?templateId=${templateId}`
              )
            }
          >
            {t('maintenanceTemplate.recordNow')}
          </Button>
        ) : null}

        {/* Delete (admin only) */}
        {adminUser ? (
          <Button
            variant="danger-soft"
            size="md"
            onPress={() =>
              confirmDeleteTemplate(userId, template.id, () => router.back())
            }
          >
            {t('maintenanceTemplate.deleteTask')}
          </Button>
        ) : null}
      </View>
    </ScrollView>
  )
}
