import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import {
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

import { useTranslation } from '@/lib/i18n'
import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
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

export default function CreateMaintenanceTemplateScreen() {
  const { t } = useTranslation()
  const { id: generatorId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const localUser = useLocalUser()

  const triggerLabels: Record<TriggerType, string> = {
    hours: t('maintenanceTemplate.byHours'),
    calendar: t('maintenanceTemplate.byCalendar'),
    whichever_first: t('maintenanceTemplate.whicheverFirst')
  }

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
      <Stack.Screen
        options={{
          headerRight: () => <HeaderSubmitButton onPress={handleCreate} />
        }}
      />
      <KeyboardAwareScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pt-6 pb-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
        extraKeyboardSpace={42}
      >
        <View className="mx-auto w-full max-w-150 gap-7">
          <Text className="text-muted text-3.75 leading-5.5">
            {t('maintenanceTemplate.defineDesc')}
          </Text>

          <View className="gap-5">
            <TextField isInvalid={!!fieldErrors.taskName}>
              <Label>{t('maintenanceTemplate.taskName')}</Label>
              <Input
                placeholder={t('maintenanceTemplate.taskNamePlaceholder')}
                {...field('taskName')}
                autoFocus
              />
              <FieldError>{fieldErrors.taskName}</FieldError>
            </TextField>

            <TextField>
              <Label>{t('generator.description')}</Label>
              <Input
                placeholder={t('maintenanceTemplate.instructionsPlaceholder')}
                {...field('description')}
                multiline
              />
              <Description>{t('common.optional')}</Description>
            </TextField>

            {/* Trigger Type Selector */}
            <View className="gap-2">
              <Text className="text-foreground text-sm font-medium">
                {t('maintenanceTemplate.triggerType')}
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
                      <Tabs.Label>{triggerLabels[type]}</Tabs.Label>
                    </Tabs.Trigger>
                  ))}
                </Tabs.List>
              </Tabs>
            </View>

            {showHours ? (
              <TextField isInvalid={!!fieldErrors.triggerHoursInterval}>
                <Label>{t('maintenanceTemplate.hoursInterval')}</Label>
                <Input
                  placeholder={t(
                    'maintenanceTemplate.hoursIntervalPlaceholder'
                  )}
                  {...field('triggerHoursInterval')}
                  keyboardType="decimal-pad"
                />
                <Description>
                  {t('maintenanceTemplate.hoursIntervalDesc')}
                </Description>
                <FieldError>{fieldErrors.triggerHoursInterval}</FieldError>
              </TextField>
            ) : null}

            {showCalendar ? (
              <TextField isInvalid={!!fieldErrors.triggerCalendarDays}>
                <Label>{t('maintenanceTemplate.calendarDays')}</Label>
                <Input
                  placeholder={t('maintenanceTemplate.calendarDaysPlaceholder')}
                  {...field('triggerCalendarDays')}
                  keyboardType="number-pad"
                />
                <Description>
                  {t('maintenanceTemplate.calendarDaysDesc')}
                </Description>
                <FieldError>{fieldErrors.triggerCalendarDays}</FieldError>
              </TextField>
            ) : null}
          </View>

          <FormError message={error} />
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  )
}
