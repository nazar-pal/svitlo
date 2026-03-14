import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Description, Input, Label, TextField } from 'heroui-native'
import { useEffect, useState } from 'react'
import { Keyboard, Pressable, ScrollView, Text, View } from 'react-native'

import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { createMaintenanceTemplate } from '@/data/client/mutations'
import { insertMaintenanceTemplateSchema } from '@/data/client/validation'
import { useLocalUser } from '@/lib/powersync'

const TRIGGER_TYPES = ['hours', 'calendar', 'whichever_first'] as const
type TriggerType = (typeof TRIGGER_TYPES)[number]

const TRIGGER_LABELS: Record<TriggerType, string> = {
  hours: 'By Hours',
  calendar: 'By Calendar',
  whichever_first: 'Whichever First'
}

export default function CreateMaintenanceTemplateScreen() {
  const { generatorId } = useLocalSearchParams<{ generatorId: string }>()
  const router = useRouter()
  const localUser = useLocalUser()

  const [taskName, setTaskName] = useState('')
  const [description, setDescription] = useState('')
  const [triggerType, setTriggerType] = useState<TriggerType>('hours')
  const [hoursInterval, setHoursInterval] = useState('')
  const [calendarDays, setCalendarDays] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const insets = useSafeAreaInsets()
  const [keyboardHeight, setKeyboardHeight] = useState(0)

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', e =>
      setKeyboardHeight(e.endCoordinates.height)
    )
    const hideSub = Keyboard.addListener('keyboardWillHide', () =>
      setKeyboardHeight(0)
    )
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const showHours = triggerType === 'hours' || triggerType === 'whichever_first'
  const showCalendar =
    triggerType === 'calendar' || triggerType === 'whichever_first'

  async function handleCreate() {
    if (!localUser || !generatorId) return
    setError('')
    setFieldErrors({})

    const input = {
      generatorId,
      taskName,
      description: description || undefined,
      triggerType,
      triggerHoursInterval: showHours
        ? parseFloat(hoursInterval) || undefined
        : undefined,
      triggerCalendarDays: showCalendar
        ? parseInt(calendarDays, 10) || undefined
        : undefined
    }

    const parsed = insertMaintenanceTemplateSchema.safeParse(input)
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors
      const mapped: Record<string, string> = {}
      for (const [key, msgs] of Object.entries(flat))
        if (msgs?.[0]) mapped[key] = msgs[0]
      setFieldErrors(mapped)
      return
    }

    const result = await createMaintenanceTemplate(localUser.id, input)
    if (!result.ok) {
      setError(result.error)
      return
    }

    router.back()
  }

  const contentPaddingBottom =
    keyboardHeight > 0 ? keyboardHeight + 8 : Math.max(insets.bottom, 16)

  return (
    <ScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pt-6"
      contentContainerStyle={{ paddingBottom: contentPaddingBottom }}
      keyboardShouldPersistTaps="handled"
    >
      <View className="mx-auto w-full max-w-[600px] gap-7">
        <View className="gap-2">
          <Text className="text-foreground text-3xl font-bold">
            New Maintenance Task
          </Text>
          <Text className="text-muted text-[15px] leading-[22px]">
            Define a recurring maintenance task for this generator.
          </Text>
        </View>

        <View className="gap-5">
          <TextField isInvalid={!!fieldErrors.taskName}>
            <Label>Task Name</Label>
            <Input
              placeholder='e.g. "Oil Change", "Air Filter"'
              value={taskName}
              onChangeText={setTaskName}
              autoFocus
            />
            {fieldErrors.taskName ? (
              <Description className="text-danger">
                {fieldErrors.taskName}
              </Description>
            ) : null}
          </TextField>

          <TextField>
            <Label>Description</Label>
            <Input
              placeholder="Instructions or notes..."
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <Description>Optional</Description>
          </TextField>

          {/* Trigger Type Selector */}
          <View className="gap-2">
            <Text className="text-foreground text-sm font-medium">
              Trigger Type
            </Text>
            <View className="bg-surface-secondary flex-row rounded-xl p-1">
              {TRIGGER_TYPES.map(type => (
                <Pressable
                  key={type}
                  onPress={() => setTriggerType(type)}
                  className={`flex-1 items-center rounded-lg py-2 ${
                    triggerType === type ? 'bg-background' : ''
                  }`}
                >
                  <Text
                    className={`text-[13px] font-medium ${
                      triggerType === type ? 'text-foreground' : 'text-muted'
                    }`}
                  >
                    {TRIGGER_LABELS[type]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {showHours ? (
            <TextField isInvalid={!!fieldErrors.triggerHoursInterval}>
              <Label>Hours Interval</Label>
              <Input
                placeholder="e.g. 100"
                value={hoursInterval}
                onChangeText={setHoursInterval}
                keyboardType="decimal-pad"
              />
              <Description>
                Maintenance due after this many run hours
              </Description>
              {fieldErrors.triggerHoursInterval ? (
                <Description className="text-danger">
                  {fieldErrors.triggerHoursInterval}
                </Description>
              ) : null}
            </TextField>
          ) : null}

          {showCalendar ? (
            <TextField isInvalid={!!fieldErrors.triggerCalendarDays}>
              <Label>Calendar Days</Label>
              <Input
                placeholder="e.g. 30"
                value={calendarDays}
                onChangeText={setCalendarDays}
                keyboardType="number-pad"
              />
              <Description>Maintenance due after this many days</Description>
              {fieldErrors.triggerCalendarDays ? (
                <Description className="text-danger">
                  {fieldErrors.triggerCalendarDays}
                </Description>
              ) : null}
            </TextField>
          ) : null}
        </View>

        {error ? (
          <Text className="bg-danger/10 text-danger rounded-2xl px-4 py-3 text-sm">
            {error}
          </Text>
        ) : null}

        <Button variant="primary" onPress={handleCreate}>
          Create Task
        </Button>
      </View>
    </ScrollView>
  )
}
