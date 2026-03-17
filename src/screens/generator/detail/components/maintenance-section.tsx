import { format, parseISO } from 'date-fns'
import { SymbolView } from 'expo-symbols'
import {
  ListGroup,
  PressableFeedback,
  Separator,
  Spinner,
  Surface
} from 'heroui-native'
import { Text, View } from 'react-native'
import { useCSSVariable } from 'uniwind'

import { SectionHeader } from '@/components/section-header'
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
        <SectionHeader title="Maintenance" />
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
          <Text className="text-muted text-sm">No maintenance templates</Text>
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
