import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import {
  Description,
  FieldError,
  Input,
  Label,
  Tabs,
  TextField
} from 'heroui-native'
import { Text, View } from 'react-native'
import { KeyboardToolbar } from 'react-native-keyboard-controller'

import { useTranslation } from '@/lib/i18n'
import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { createMaintenanceTemplate } from '@/data/client/mutations'
import { insertMaintenanceTemplateSchema } from '@/data/client/validation'
import { selection } from '@/lib/haptics'
import { useForm, validateWithZod } from '@/lib/hooks/forms'
import {
  TRIGGER_TYPES,
  type TriggerType,
  isTriggerType,
  parseOptionalNumber,
  showsCalendar,
  showsHours
} from '@/lib/maintenance/trigger-type'
import { useTriggerLabels } from '@/lib/maintenance/use-trigger-labels'
import { useLocalUser } from '@/lib/powersync'

export default function CreateMaintenanceTemplateScreen() {
  const { id: generatorId } = useLocalSearchParams<{ id: string }>()
  const localUser = useLocalUser()
  if (!localUser || !generatorId) return null
  return <CreateForm userId={localUser.id} generatorId={generatorId} />
}

interface CreateFormProps {
  userId: string
  generatorId: string
}

function CreateForm({ userId, generatorId }: CreateFormProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const triggerLabels = useTriggerLabels()

  const { form, submit, formError, bind } = useForm({
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
        triggerHoursInterval: showsHours(values.triggerType)
          ? parseOptionalNumber(values.triggerHoursInterval, parseFloat)
          : undefined,
        triggerCalendarDays: showsCalendar(values.triggerType)
          ? parseOptionalNumber(values.triggerCalendarDays, s =>
              parseInt(s, 10)
            )
          : undefined
      }),
    mutate: input => createMaintenanceTemplate(userId, input),
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
    <>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderSubmitButton onPress={submit} />
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
            <TextField isInvalid={taskNameBinding.isInvalid}>
              <Label>{t('maintenanceTemplate.taskName')}</Label>
              <Input
                testID="create-template-name-input"
                placeholder={t('maintenanceTemplate.taskNamePlaceholder')}
                value={taskNameBinding.value}
                onChangeText={taskNameBinding.onChangeText}
                autoFocus
              />
              <FieldError>{taskNameBinding.errorMessage}</FieldError>
            </TextField>

            <TextField>
              <Label>{t('generator.description')}</Label>
              <Input
                placeholder={t('maintenanceTemplate.instructionsPlaceholder')}
                value={descriptionBinding.value}
                onChangeText={descriptionBinding.onChangeText}
                multiline
              />
              <Description>{t('common.optional')}</Description>
            </TextField>

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
              <TextField isInvalid={hoursBinding.isInvalid}>
                <Label>{t('maintenanceTemplate.hoursInterval')}</Label>
                <Input
                  testID="create-template-hours-input"
                  placeholder={t(
                    'maintenanceTemplate.hoursIntervalPlaceholder'
                  )}
                  value={hoursBinding.value}
                  onChangeText={hoursBinding.onChangeText}
                  keyboardType="decimal-pad"
                />
                <Description>
                  {t('maintenanceTemplate.hoursIntervalDesc')}
                </Description>
                <FieldError>{hoursBinding.errorMessage}</FieldError>
              </TextField>
            ) : null}

            {showCalendar ? (
              <TextField isInvalid={daysBinding.isInvalid}>
                <Label>{t('maintenanceTemplate.calendarDays')}</Label>
                <Input
                  testID="create-template-days-input"
                  placeholder={t('maintenanceTemplate.calendarDaysPlaceholder')}
                  value={daysBinding.value}
                  onChangeText={daysBinding.onChangeText}
                  keyboardType="number-pad"
                />
                <Description>
                  {t('maintenanceTemplate.calendarDaysDesc')}
                </Description>
                <FieldError>{daysBinding.errorMessage}</FieldError>
              </TextField>
            ) : null}
          </View>

          <FormError message={formError} />
        </View>
      </KeyboardAwareScrollView>
      <KeyboardToolbar />
    </>
  )
}
