import { useRouter } from 'expo-router'
import { Tabs } from 'heroui-native'
import { Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormField } from '@/components/form/form-field'
import { FormScreen } from '@/components/form/form-screen'
import { createMaintenanceTemplate } from '@/data/client/mutations'
import { insertMaintenanceTemplateSchema } from '@/data/shared/validation'
import { selection } from '@/lib/haptics'
import { useAuthedParams } from '@/lib/hooks/use-authed-params'
import { useForm, validateWithZod } from '@/lib/hooks/forms'
import {
  TRIGGER_TYPES,
  type TriggerType,
  isTriggerType,
  parseOptionalNumber,
  usesCalendar,
  usesHours
} from '@/lib/maintenance/trigger-type'
import { useTriggerLabels } from '@/lib/maintenance/use-trigger-labels'

export default function CreateMaintenanceTemplateScreen() {
  const ctx = useAuthedParams(['id'])
  if (!ctx) return null
  return <CreateForm userId={ctx.userId} generatorId={ctx.params.id} />
}

interface CreateFormProps {
  userId: string
  generatorId: string
}

function CreateForm({ userId, generatorId }: CreateFormProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const triggerLabels = useTriggerLabels()

  const { form, submit, formError, isSubmitting, bind } = useForm({
    initial: {
      taskName: '',
      description: '',
      triggerType: 'hours' as TriggerType,
      triggerHoursInterval: '',
      triggerCalendarDays: ''
    },
    build: values =>
      validateWithZod(insertMaintenanceTemplateSchema, {
        generatorId,
        taskName: values.taskName,
        description: values.description || undefined,
        triggerType: values.triggerType,
        triggerHoursInterval: usesHours(values.triggerType)
          ? parseOptionalNumber(values.triggerHoursInterval, parseFloat)
          : undefined,
        triggerCalendarDays: usesCalendar(values.triggerType)
          ? parseOptionalNumber(values.triggerCalendarDays, s =>
              parseInt(s, 10)
            )
          : undefined
      }),
    mutate: input => createMaintenanceTemplate(userId, input),
    onSuccess: () => router.back()
  })

  const triggerType = form.values.triggerType
  const showHours = usesHours(triggerType)
  const showCalendar = usesCalendar(triggerType)

  const taskNameBinding = bind.text('taskName')
  const descriptionBinding = bind.text('description')
  const hoursBinding = bind.text('triggerHoursInterval')
  const daysBinding = bind.text('triggerCalendarDays')

  return (
    <FormScreen
      onSubmit={submit}
      isSubmitting={isSubmitting}
      variant="long-form"
      formError={formError}
    >
      <Text className="text-muted text-3.75 leading-5.5">
        {t('maintenanceTemplate.defineDesc')}
      </Text>

      <View className="gap-5">
        <FormField
          binding={taskNameBinding}
          label={t('maintenanceTemplate.taskName')}
          testID="create-template-name-input"
          placeholder={t('maintenanceTemplate.taskNamePlaceholder')}
          autoFocus
        />

        <FormField
          binding={descriptionBinding}
          label={t('generator.description')}
          description={t('common.optional')}
          placeholder={t('maintenanceTemplate.instructionsPlaceholder')}
          multiline
        />

        <View className="gap-2">
          <Text
            testID="create-template-trigger-type-label"
            className="text-foreground text-sm font-medium"
          >
            {t('maintenanceTemplate.triggerType')}
          </Text>
          <Tabs
            value={form.values.triggerType}
            onValueChange={v => {
              selection()
              if (isTriggerType(v)) form.set('triggerType', v)
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
          <FormField
            binding={hoursBinding}
            label={t('maintenanceTemplate.hoursInterval')}
            description={t('maintenanceTemplate.hoursIntervalDesc')}
            testID="create-template-hours-input"
            placeholder={t('maintenanceTemplate.hoursIntervalPlaceholder')}
            keyboardType="decimal-pad"
          />
        ) : null}

        {showCalendar ? (
          <FormField
            binding={daysBinding}
            label={t('maintenanceTemplate.calendarDays')}
            description={t('maintenanceTemplate.calendarDaysDesc')}
            testID="create-template-days-input"
            placeholder={t('maintenanceTemplate.calendarDaysPlaceholder')}
            keyboardType="number-pad"
          />
        ) : null}
      </View>
    </FormScreen>
  )
}
