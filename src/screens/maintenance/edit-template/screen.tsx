import { useRouter } from 'expo-router'
import { Tabs } from 'heroui-native'
import { Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormField } from '@/components/form/form-field'
import { FormScreen } from '@/components/form/form-screen'
import { updateMaintenanceTemplate } from '@/data/client/mutations'
import type { MaintenanceTemplate } from '@/data/client/db-schema/maintenance'
import { getMaintenanceTemplate } from '@/data/client/queries'
import { updateMaintenanceTemplateSchema } from '@/data/shared/validation'
import { selection } from '@/lib/haptics'
import { useAuthedParams } from '@/lib/hooks/use-authed-params'
import { useForm, validateWithZod } from '@/lib/hooks/forms'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import {
  TRIGGER_TYPES,
  isTriggerType,
  parseOptionalNumber,
  showsCalendar,
  showsHours
} from '@/lib/maintenance/trigger-type'
import { useTriggerLabels } from '@/lib/maintenance/use-trigger-labels'

export default function EditMaintenanceTemplateScreen() {
  const ctx = useAuthedParams(['id', 'templateId'])

  const { data: templateData } = useDrizzleQuery(
    ctx ? getMaintenanceTemplate(ctx.params.templateId) : undefined
  )
  const template = templateData[0]

  if (!ctx || !template) return null

  return <EditForm userId={ctx.userId} template={template} />
}

interface EditFormProps {
  userId: string
  template: MaintenanceTemplate
}

function EditForm({ userId, template }: EditFormProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const triggerLabels = useTriggerLabels()

  const { form, submit, formError, isSubmitting, bind } = useForm({
    initial: {
      taskName: template.taskName,
      description: template.description ?? '',
      triggerType: template.triggerType,
      triggerHoursInterval: template.triggerHoursInterval
        ? String(template.triggerHoursInterval)
        : '',
      triggerCalendarDays: template.triggerCalendarDays
        ? String(template.triggerCalendarDays)
        : ''
    },
    build: values =>
      validateWithZod(updateMaintenanceTemplateSchema, {
        taskName: values.taskName,
        description: values.description || null,
        triggerType: values.triggerType,
        triggerHoursInterval: showsHours(values.triggerType)
          ? (parseOptionalNumber(values.triggerHoursInterval, parseFloat) ??
            null)
          : null,
        triggerCalendarDays: showsCalendar(values.triggerType)
          ? (parseOptionalNumber(values.triggerCalendarDays, s =>
              parseInt(s, 10)
            ) ?? null)
          : null
      }),
    mutate: input => updateMaintenanceTemplate(userId, template.id, input),
    onSuccess: () => router.back()
  })

  const triggerType = form.values.triggerType
  const showHours = showsHours(triggerType)
  const showCalendar = showsCalendar(triggerType)

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
      <View className="gap-5">
        <FormField
          binding={taskNameBinding}
          label={t('maintenanceTemplate.taskName')}
          placeholder={t('maintenanceTemplate.taskNamePlaceholder')}
        />

        <FormField
          binding={descriptionBinding}
          label={t('generator.description')}
          description={t('common.optional')}
          placeholder={t('maintenanceTemplate.instructionsPlaceholder')}
          multiline
        />

        <View className="gap-2">
          <Text className="text-foreground text-sm font-medium">
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
            placeholder={t('maintenanceTemplate.hoursIntervalPlaceholder')}
            keyboardType="decimal-pad"
          />
        ) : null}

        {showCalendar ? (
          <FormField
            binding={daysBinding}
            label={t('maintenanceTemplate.calendarDays')}
            description={t('maintenanceTemplate.calendarDaysDesc')}
            placeholder={t('maintenanceTemplate.calendarDaysPlaceholder')}
            keyboardType="number-pad"
          />
        ) : null}
      </View>
    </FormScreen>
  )
}
