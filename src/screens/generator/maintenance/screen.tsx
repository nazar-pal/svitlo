import { Host, Button as SwiftButton } from '@expo/ui/swift-ui'
import { font, labelStyle } from '@expo/ui/swift-ui/modifiers'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { parseISO } from 'date-fns'
import { SymbolView } from 'expo-symbols'
import { ScrollView, Text, View } from 'react-native'
import { ListGroup, Separator, Surface, useThemeColor } from 'heroui-native'

import {
  getGenerator,
  getAllOrganizations,
  getGeneratorSessions,
  getMaintenanceRecords,
  getMaintenanceTemplates
} from '@/data/client/queries'
import { formatDate, useTranslation } from '@/lib/i18n'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import {
  computeAllMaintenanceItems,
  formatMaintenanceLabel
} from '@/lib/maintenance/due'
import { useLocalUser } from '@/lib/powersync'

export default function MaintenanceScreen() {
  const { t } = useTranslation()
  const { id: generatorId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const localUser = useLocalUser()
  const [mutedColor, dangerColor, warningColor, successColor] = useThemeColor([
    'muted',
    'danger',
    'warning',
    'success'
  ])

  const userId = localUser?.id ?? ''

  const { data: gens } = useDrizzleQuery(
    generatorId ? getGenerator(generatorId) : undefined
  )
  const generator = gens[0]

  const { data: templates } = useDrizzleQuery(
    generatorId ? getMaintenanceTemplates(generatorId) : undefined
  )

  const { data: records } = useDrizzleQuery(
    generatorId ? getMaintenanceRecords(generatorId) : undefined
  )

  const { data: sessions } = useDrizzleQuery(
    generatorId ? getGeneratorSessions(generatorId) : undefined
  )

  const { data: allOrgs } = useDrizzleQuery(getAllOrganizations())

  if (!generator) return null

  const org = allOrgs.find(o => o.id === generator.organizationId)
  const isAdmin = org?.adminUserId === userId

  const itemInfoMap = new Map(
    computeAllMaintenanceItems(templates, records, sessions).map(item => [
      item.templateId,
      item
    ])
  )

  function getLastRecordForTemplate(templateId: string) {
    return records.find(r => r.templateId === templateId)
  }

  function getIconColor(templateId: string, hasRecord: boolean) {
    const info = itemInfoMap.get(templateId)
    if (!info) return mutedColor
    if (info.urgency === 'overdue') return dangerColor
    if (info.urgency === 'due_soon') return warningColor
    if (hasRecord) return successColor
    return mutedColor
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pt-6 pb-6"
    >
      <Stack.Screen
        options={{
          title: t('tabs.maintenance'),
          headerRight: isAdmin
            ? () => (
                <Host matchContents>
                  <SwiftButton
                    label={t('screens.newTask')}
                    systemImage="plus"
                    onPress={() =>
                      router.push(`/generator/${generatorId}/create-template`)
                    }
                    modifiers={[labelStyle('iconOnly'), font({ size: 20 })]}
                  />
                </Host>
              )
            : undefined
        }}
      />

      {templates.length === 0 ? (
        <Surface variant="secondary" className="items-center py-6">
          <Text className="text-muted text-sm">
            {t('maintenanceTemplate.noTemplates')}
          </Text>
        </Surface>
      ) : (
        <ListGroup>
          {templates.map((template, index) => {
            const lastRecord = getLastRecordForTemplate(template.id)
            const itemInfo = itemInfoMap.get(template.id)
            const iconColor = getIconColor(template.id, !!lastRecord)
            return (
              <View key={template.id}>
                {index > 0 ? <Separator className="mx-4" /> : null}
                <ListGroup.Item
                  onPress={() =>
                    router.push(
                      `/generator/${generatorId}/template-details?templateId=${template.id}`
                    )
                  }
                >
                  <ListGroup.ItemPrefix>
                    <SymbolView
                      name="wrench.fill"
                      size={18}
                      tintColor={iconColor}
                    />
                  </ListGroup.ItemPrefix>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>
                      {template.taskName}
                    </ListGroup.ItemTitle>
                    <ListGroup.ItemDescription>
                      {template.isOneTime
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
                              })}
                      {lastRecord
                        ? ' · ' +
                          t('maintenanceTemplate.last', {
                            date: formatDate(
                              parseISO(lastRecord.performedAt),
                              'PP'
                            )
                          })
                        : null}
                    </ListGroup.ItemDescription>
                    {!lastRecord ? (
                      <Text className="text-warning text-xs">
                        {t('maintenanceTemplate.neverPerformed')}
                      </Text>
                    ) : itemInfo && itemInfo.urgency !== 'ok' ? (
                      <Text
                        className={`text-xs ${itemInfo.urgency === 'overdue' ? 'text-danger' : 'text-warning'}`}
                      >
                        {formatMaintenanceLabel(itemInfo)}
                      </Text>
                    ) : null}
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
    </ScrollView>
  )
}
