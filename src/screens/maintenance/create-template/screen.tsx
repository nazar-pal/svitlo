import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  Tabs,
  TextField
} from 'heroui-native'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { KeyboardToolbar } from 'react-native-keyboard-controller'

import { FormError } from '@/components/form-error'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { createMaintenanceTemplate } from '@/data/client/mutations'
import {
  flattenZodErrors,
  insertMaintenanceTemplateSchema
} from '@/data/client/validation'
import { notifySuccess, selection } from '@/lib/haptics'
import { useFormFields } from '@/lib/hooks/use-form-fields'
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

  const { values, field, set, fieldErrors, setFieldErrors } = useFormFields({
    taskName: '',
    description: '',
    triggerType: 'hours',
    triggerHoursInterval: '',
    triggerCalendarDays: ''
  })
  const [error, setError] = useState('')
  const triggerType = values.triggerType as TriggerType
  const showHours = triggerType === 'hours' || triggerType === 'whichever_first'
  const showCalendar =
    triggerType === 'calendar' || triggerType === 'whichever_first'

  async function handleCreate() {
    if (!localUser || !generatorId) return
    setError('')
    setFieldErrors({})

    const input = {
      generatorId,
      taskName: values.taskName,
      description: values.description || undefined,
      triggerType,
      triggerHoursInterval: showHours
        ? parseFloat(values.triggerHoursInterval) || undefined
        : undefined,
      triggerCalendarDays: showCalendar
        ? parseInt(values.triggerCalendarDays, 10) || undefined
        : undefined
    }

    const parsed = insertMaintenanceTemplateSchema.safeParse(input)
    if (!parsed.success) {
      setFieldErrors(flattenZodErrors(parsed.error))
      return
    }

    const result = await createMaintenanceTemplate(localUser.id, input)
    if (!result.ok) {
      setError(result.error)
      return
    }

    notifySuccess()
    router.back()
  }

  return (
    <>
      <KeyboardAwareScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pt-6 pb-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
        extraKeyboardSpace={42}
      >
        <View className="mx-auto w-full max-w-150 gap-7">
          <View className="gap-2">
            <Text className="text-foreground text-3xl font-bold">
              New Maintenance Task
            </Text>
            <Text className="text-muted text-3.75 leading-5.5">
              Define a recurring maintenance task for this generator.
            </Text>
          </View>

          <View className="gap-5">
            <TextField isInvalid={!!fieldErrors.taskName}>
              <Label>Task Name</Label>
              <Input
                placeholder='e.g. "Oil Change", "Air Filter"'
                {...field('taskName')}
                autoFocus
              />
              <FieldError>{fieldErrors.taskName}</FieldError>
            </TextField>

            <TextField>
              <Label>Description</Label>
              <Input
                placeholder="Instructions or notes..."
                {...field('description')}
                multiline
              />
              <Description>Optional</Description>
            </TextField>

            {/* Trigger Type Selector */}
            <View className="gap-2">
              <Text className="text-foreground text-sm font-medium">
                Trigger Type
              </Text>
              <Tabs
                value={values.triggerType}
                onValueChange={v => {
                  selection()
                  set('triggerType', v)
                }}
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
              <TextField isInvalid={!!fieldErrors.triggerHoursInterval}>
                <Label>Hours Interval</Label>
                <Input
                  placeholder="e.g. 100"
                  {...field('triggerHoursInterval')}
                  keyboardType="decimal-pad"
                />
                <Description>
                  Maintenance due after this many run hours
                </Description>
                <FieldError>{fieldErrors.triggerHoursInterval}</FieldError>
              </TextField>
            ) : null}

            {showCalendar ? (
              <TextField isInvalid={!!fieldErrors.triggerCalendarDays}>
                <Label>Calendar Days</Label>
                <Input
                  placeholder="e.g. 30"
                  {...field('triggerCalendarDays')}
                  keyboardType="number-pad"
                />
                <Description>Maintenance due after this many days</Description>
                <FieldError>{fieldErrors.triggerCalendarDays}</FieldError>
              </TextField>
            ) : null}
          </View>

          <FormError message={error} />

          <Button variant="primary" onPress={handleCreate}>
            Create Task
          </Button>
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  )
}
