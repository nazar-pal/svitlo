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
import { updateMaintenanceTemplate } from '@/data/client/mutations'
import type { MaintenanceTemplate } from '@/data/client/db-schema/maintenance'
import { getMaintenanceTemplate } from '@/data/client/queries'
import {
  flattenZodErrors,
  updateMaintenanceTemplateSchema
} from '@/data/client/validation'
import { notifySuccess, selection } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useFormFields } from '@/lib/hooks/use-form-fields'
import { useLocalUser } from '@/lib/powersync'

const TRIGGER_TYPES = ['hours', 'calendar', 'whichever_first'] as const
type TriggerType = (typeof TRIGGER_TYPES)[number]

export default function EditMaintenanceTemplateScreen() {
  const { templateId } = useLocalSearchParams<{
    id: string
    templateId: string
  }>()

  const { data: templateData } = useDrizzleQuery(
    templateId ? getMaintenanceTemplate(templateId) : undefined
  )
  const template = templateData[0]

  if (!template) return null

  return <EditForm template={template} />
}

function EditForm({ template }: { template: MaintenanceTemplate }) {
  const { t } = useTranslation()
  const router = useRouter()
  const localUser = useLocalUser()

  const triggerLabels: Record<TriggerType, string> = {
    hours: t('maintenanceTemplate.byHours'),
    calendar: t('maintenanceTemplate.byCalendar'),
    whichever_first: t('maintenanceTemplate.whicheverFirst')
  }

  const { values, field, set, fieldErrors, setFieldErrors } = useFormFields({
    taskName: template.taskName,
    description: template.description ?? '',
    triggerType: template.triggerType,
    triggerHoursInterval: template.triggerHoursInterval
      ? String(template.triggerHoursInterval)
      : '',
    triggerCalendarDays: template.triggerCalendarDays
      ? String(template.triggerCalendarDays)
      : ''
  })
  const [error, setError] = useState('')
  const triggerType = values.triggerType as TriggerType
  const showHours = triggerType === 'hours' || triggerType === 'whichever_first'
  const showCalendar =
    triggerType === 'calendar' || triggerType === 'whichever_first'

  async function handleSave() {
    if (!localUser) return
    setError('')
    setFieldErrors({})

    const toNum = (v: string, parse: (s: string) => number) => {
      const n = parse(v)
      return Number.isFinite(n) ? n : undefined
    }

    const input = {
      taskName: values.taskName,
      description: values.description || null,
      triggerType,
      triggerHoursInterval: showHours
        ? (toNum(values.triggerHoursInterval, parseFloat) ?? null)
        : null,
      triggerCalendarDays: showCalendar
        ? (toNum(values.triggerCalendarDays, s => parseInt(s, 10)) ?? null)
        : null
    }

    const parsed = updateMaintenanceTemplateSchema.safeParse(input)
    if (!parsed.success) {
      setFieldErrors(flattenZodErrors(parsed.error))
      return
    }

    const result = await updateMaintenanceTemplate(
      localUser.id,
      template.id,
      parsed.data
    )
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
          headerRight: () => <HeaderSubmitButton onPress={handleSave} />
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
          <View className="gap-5">
            <TextField isInvalid={!!fieldErrors.taskName}>
              <Label>{t('maintenanceTemplate.taskName')}</Label>
              <Input
                placeholder={t('maintenanceTemplate.taskNamePlaceholder')}
                {...field('taskName')}
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
