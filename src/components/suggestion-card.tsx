import {
  Checkbox,
  Description,
  Input,
  Label,
  Tabs,
  TextField
} from 'heroui-native'
import { Pressable, Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { selection } from '@/lib/haptics'

export interface EditableItem {
  taskName: string
  description: string
  triggerType: 'hours' | 'calendar' | 'whichever_first'
  triggerHoursInterval: number | null
  triggerCalendarDays: number | null
  isOneTime: boolean
  selected: boolean
}

const TRIGGER_TYPES = ['hours', 'calendar', 'whichever_first'] as const
type TriggerType = (typeof TRIGGER_TYPES)[number]

export function SuggestionCard({
  item,
  onToggle,
  onUpdate
}: {
  item: EditableItem
  onToggle: () => void
  onUpdate: (update: Partial<EditableItem>) => void
}) {
  const { t } = useTranslation()
  const triggerShortLabels: Record<TriggerType, string> = {
    hours: t('maintenanceTemplate.hours'),
    calendar: t('maintenanceTemplate.calendar'),
    whichever_first: t('maintenanceTemplate.first')
  }
  const showHours =
    item.triggerType === 'hours' || item.triggerType === 'whichever_first'
  const showCalendar =
    item.triggerType === 'calendar' || item.triggerType === 'whichever_first'

  return (
    <View className={`py-3 ${!item.selected ? 'opacity-40' : ''}`}>
      <Pressable
        onPress={() => {
          selection()
          onToggle()
        }}
        className="flex-row items-center gap-3"
      >
        <Checkbox isSelected={item.selected} />
        <Text
          className="text-foreground text-3.75 flex-1 font-medium"
          numberOfLines={item.selected ? undefined : 1}
        >
          {item.taskName}
        </Text>
      </Pressable>

      {item.selected ? (
        <View className="mt-3 ml-9 gap-3">
          <TextField>
            <Label>{t('maintenanceTemplate.taskName')}</Label>
            <Input
              value={item.taskName}
              onChangeText={v => onUpdate({ taskName: v })}
            />
          </TextField>

          <TextField>
            <Label>{t('generator.description')}</Label>
            <Input
              value={item.description}
              onChangeText={v => onUpdate({ description: v })}
              multiline
            />
          </TextField>

          <View className="gap-2">
            <Text className="text-foreground text-sm font-medium">
              {t('maintenanceTemplate.triggerType')}
            </Text>
            <Tabs
              value={item.triggerType}
              onValueChange={v => {
                selection()
                onUpdate({ triggerType: v as TriggerType })
              }}
            >
              <Tabs.List>
                <Tabs.Indicator />
                {TRIGGER_TYPES.map(type => (
                  <Tabs.Trigger key={type} value={type}>
                    <Tabs.Label>{triggerShortLabels[type]}</Tabs.Label>
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs>
          </View>

          {showHours ? (
            <TextField>
              <Label>{t('maintenanceTemplate.hoursInterval')}</Label>
              <Input
                value={item.triggerHoursInterval?.toString() ?? ''}
                onChangeText={v =>
                  onUpdate({ triggerHoursInterval: parseFloat(v) || null })
                }
                keyboardType="decimal-pad"
              />
              <Description>
                {t('maintenanceTemplate.runHoursBetween')}
              </Description>
            </TextField>
          ) : null}

          {showCalendar ? (
            <TextField>
              <Label>{t('maintenanceTemplate.calendarDays')}</Label>
              <Input
                value={item.triggerCalendarDays?.toString() ?? ''}
                onChangeText={v =>
                  onUpdate({ triggerCalendarDays: parseInt(v, 10) || null })
                }
                keyboardType="number-pad"
              />
              <Description>{t('maintenanceTemplate.daysBetween')}</Description>
            </TextField>
          ) : null}

          <Pressable
            onPress={() => {
              selection()
              onUpdate({ isOneTime: !item.isOneTime })
            }}
            className="flex-row items-center gap-3"
          >
            <Checkbox isSelected={item.isOneTime} />
            <Text className="text-foreground text-sm">
              {t('maintenanceTemplate.oneTimeTask')}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}
