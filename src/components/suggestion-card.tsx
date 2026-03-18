import {
  Checkbox,
  Description,
  Input,
  Label,
  Tabs,
  TextField
} from 'heroui-native'
import { Pressable, Text, View } from 'react-native'

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

const TRIGGER_LABELS: Record<TriggerType, string> = {
  hours: 'Hours',
  calendar: 'Calendar',
  whichever_first: 'First'
}

export function SuggestionCard({
  item,
  onToggle,
  onUpdate
}: {
  item: EditableItem
  onToggle: () => void
  onUpdate: (update: Partial<EditableItem>) => void
}) {
  const showHours =
    item.triggerType === 'hours' || item.triggerType === 'whichever_first'
  const showCalendar =
    item.triggerType === 'calendar' || item.triggerType === 'whichever_first'

  return (
    <View className={`py-3 ${!item.selected ? 'opacity-40' : ''}`}>
      <Pressable onPress={onToggle} className="flex-row items-center gap-3">
        <Checkbox isSelected={item.selected} onSelectedChange={onToggle} />
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
            <Label>Task Name</Label>
            <Input
              value={item.taskName}
              onChangeText={v => onUpdate({ taskName: v })}
            />
          </TextField>

          <TextField>
            <Label>Description</Label>
            <Input
              value={item.description}
              onChangeText={v => onUpdate({ description: v })}
              multiline
            />
          </TextField>

          <View className="gap-2">
            <Text className="text-foreground text-sm font-medium">
              Trigger Type
            </Text>
            <Tabs
              value={item.triggerType}
              onValueChange={v => onUpdate({ triggerType: v as TriggerType })}
            >
              <Tabs.List>
                <Tabs.Indicator />
                {TRIGGER_TYPES.map(type => (
                  <Tabs.Trigger key={type} value={type}>
                    <Tabs.Label>{TRIGGER_LABELS[type]}</Tabs.Label>
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
            </Tabs>
          </View>

          {showHours ? (
            <TextField>
              <Label>Hours Interval</Label>
              <Input
                value={item.triggerHoursInterval?.toString() ?? ''}
                onChangeText={v =>
                  onUpdate({ triggerHoursInterval: parseFloat(v) || null })
                }
                keyboardType="decimal-pad"
              />
              <Description>Run hours between maintenance</Description>
            </TextField>
          ) : null}

          {showCalendar ? (
            <TextField>
              <Label>Calendar Days</Label>
              <Input
                value={item.triggerCalendarDays?.toString() ?? ''}
                onChangeText={v =>
                  onUpdate({ triggerCalendarDays: parseInt(v, 10) || null })
                }
                keyboardType="number-pad"
              />
              <Description>Days between maintenance</Description>
            </TextField>
          ) : null}

          <Pressable
            onPress={() => onUpdate({ isOneTime: !item.isOneTime })}
            className="flex-row items-center gap-3"
          >
            <Checkbox
              isSelected={item.isOneTime}
              onSelectedChange={() => onUpdate({ isOneTime: !item.isOneTime })}
            />
            <Text className="text-foreground text-sm">One-time task</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  )
}
