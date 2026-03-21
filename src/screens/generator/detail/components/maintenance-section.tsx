import { parseISO } from 'date-fns'
import { SymbolView } from 'expo-symbols'
import {
  ListGroup,
  PressableFeedback,
  Separator,
  Spinner,
  Surface,
  useThemeColor
} from 'heroui-native'
import { Text, View } from 'react-native'

import { SectionHeader } from '@/components/section-header'
import type {
  MaintenanceRecord,
  MaintenanceTemplate
} from '@/data/client/db-schema'
import { formatDate, useTranslation } from '@/lib/i18n'

interface MaintenanceSectionProps {
  templates: MaintenanceTemplate[]
  records: MaintenanceRecord[]
  generatorId: string
  isAdmin: boolean
  isSuggesting: boolean
  onSuggest: () => void
  onAddTemplate: () => void
  onRecordMaintenance: (templateId: string) => void
}

export function MaintenanceSection({
  templates,
  records,
  generatorId,
  isAdmin,
  isSuggesting,
  onSuggest,
  onAddTemplate,
  onRecordMaintenance
}: MaintenanceSectionProps) {
  const { t } = useTranslation()
  const foregroundColor = useThemeColor('foreground')
  const mutedColor = useThemeColor('muted')

  function getLastRecordForTemplate(templateId: string) {
    return records.find(r => r.templateId === templateId)
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <SectionHeader title={t('tabs.maintenance')} />
        {isAdmin ? (
          <View className="flex-row items-center gap-3">
            {isSuggesting ? (
              <Spinner size="sm" />
            ) : (
              <PressableFeedback onPress={onSuggest}>
                <SymbolView
                  name="sparkles"
                  size={20}
                  tintColor={foregroundColor}
                />
              </PressableFeedback>
            )}
            <PressableFeedback onPress={onAddTemplate}>
              <SymbolView
                name="plus.circle.fill"
                size={22}
                tintColor={foregroundColor}
              />
            </PressableFeedback>
          </View>
        ) : null}
      </View>

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
                  onPress={() => onRecordMaintenance(template.id)}
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
    </View>
  )
}
