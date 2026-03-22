import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { parseISO } from 'date-fns'
import { SymbolView } from 'expo-symbols'
import { ScrollView, Text, View } from 'react-native'
import {
  ListGroup,
  PressableFeedback,
  Separator,
  Surface,
  useThemeColor
} from 'heroui-native'

import {
  getGenerator,
  getAllOrganizations,
  getMaintenanceRecords,
  getMaintenanceTemplates
} from '@/data/client/queries'
import { formatDate, useTranslation } from '@/lib/i18n'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

export default function MaintenanceScreen() {
  const { t } = useTranslation()
  const { id: generatorId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const localUser = useLocalUser()
  const foregroundColor = useThemeColor('foreground')
  const mutedColor = useThemeColor('muted')

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

  const { data: allOrgs } = useDrizzleQuery(getAllOrganizations())

  if (!generator) return null

  const org = allOrgs.find(o => o.id === generator.organizationId)
  const isAdmin = org?.adminUserId === userId

  function getLastRecordForTemplate(templateId: string) {
    return records.find(r => r.templateId === templateId)
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10 pt-2"
    >
      <Stack.Screen options={{ title: t('tabs.maintenance') }} />

      {isAdmin ? (
        <View className="mb-3 flex-row justify-end">
          <PressableFeedback
            onPress={() =>
              router.push(`/generator/${generatorId}/create-template`)
            }
          >
            <SymbolView
              name="plus.circle.fill"
              size={22}
              tintColor={foregroundColor}
            />
          </PressableFeedback>
        </View>
      ) : null}

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
            return (
              <View key={template.id}>
                {index > 0 ? <Separator className="mx-4" /> : null}
                <ListGroup.Item
                  onPress={() =>
                    router.push(
                      `/generator/${generatorId}/record-maintenance?templateId=${template.id}`
                    )
                  }
                >
                  <ListGroup.ItemPrefix>
                    <SymbolView
                      name="wrench.fill"
                      size={18}
                      tintColor={mutedColor}
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
