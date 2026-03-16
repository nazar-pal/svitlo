import { format, parseISO } from 'date-fns'
import { SymbolView } from 'expo-symbols'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { ListGroup, Separator } from 'heroui-native'
import { useCSSVariable } from 'uniwind'

import type {
  MaintenanceRecord,
  MaintenanceTemplate
} from '@/data/client/db-schema'

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
  const foregroundColor = useCSSVariable('--color-foreground') as
    | string
    | undefined
  const mutedColor = useCSSVariable('--color-muted') as string | undefined

  function getLastRecordForTemplate(templateId: string) {
    return records.find(r => r.templateId === templateId)
  }

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-muted ml-4 text-xs uppercase">Maintenance</Text>
        {isAdmin ? (
          <View className="flex-row items-center gap-3">
            {isSuggesting ? (
              <ActivityIndicator size="small" />
            ) : (
              <Pressable onPress={onSuggest} className="active:opacity-70">
                <SymbolView
                  name="sparkles"
                  size={20}
                  tintColor={foregroundColor}
                />
              </Pressable>
            )}
            <Pressable onPress={onAddTemplate} className="active:opacity-70">
              <SymbolView
                name="plus.circle.fill"
                size={22}
                tintColor={foregroundColor}
              />
            </Pressable>
          </View>
        ) : null}
      </View>

      {templates.length === 0 ? (
        <View className="bg-surface-secondary items-center rounded-2xl py-6">
          <Text className="text-muted text-sm">No maintenance templates</Text>
        </View>
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
                          ? `Once at ${template.triggerHoursInterval}h`
                          : template.triggerType === 'calendar'
                            ? `Once at ${template.triggerCalendarDays} days`
                            : `Once at ${template.triggerHoursInterval}h or ${template.triggerCalendarDays} days`
                        : template.triggerType === 'hours'
                          ? `Every ${template.triggerHoursInterval}h`
                          : template.triggerType === 'calendar'
                            ? `Every ${template.triggerCalendarDays} days`
                            : `${template.triggerHoursInterval}h or ${template.triggerCalendarDays} days`}
                      {lastRecord
                        ? ` · Last: ${format(parseISO(lastRecord.performedAt), 'PP')}`
                        : null}
                    </ListGroup.ItemDescription>
                    {!lastRecord ? (
                      <Text className="text-warning text-xs">
                        Never performed
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
