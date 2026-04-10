import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Card, Description, Input, Label, TextField } from 'heroui-native'
import { Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { recordMaintenance } from '@/data/client/mutations'
import { getGenerator, getMaintenanceTemplate } from '@/data/client/queries'
import { useForm } from '@/lib/hooks/forms'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

export default function RecordMaintenanceScreen() {
  const { id: generatorId, templateId } = useLocalSearchParams<{
    id: string
    templateId: string
  }>()
  const localUser = useLocalUser()
  if (!localUser || !templateId || !generatorId) return null
  return (
    <RecordForm
      userId={localUser.id}
      templateId={templateId}
      generatorId={generatorId}
    />
  )
}

interface RecordFormProps {
  userId: string
  templateId: string
  generatorId: string
}

function RecordForm({ userId, templateId, generatorId }: RecordFormProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const { data: templateData } = useDrizzleQuery(
    getMaintenanceTemplate(templateId)
  )
  const template = templateData[0]

  const { data: generatorData } = useDrizzleQuery(getGenerator(generatorId))
  const generator = generatorData[0]

  const { submit, formError, isSubmitting, bind } = useForm({
    initial: { notes: '' },
    build: values => ({
      ok: true,
      data: {
        templateId,
        generatorId,
        notes: values.notes || undefined
      }
    }),
    mutate: input => recordMaintenance(userId, input),
    onSuccess: () => router.back()
  })

  const notesBinding = bind.text('notes')

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderSubmitButton onPress={submit} isDisabled={isSubmitting} />
          )
        }}
      />
      <KeyboardAwareScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pb-10 pt-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
      >
        <View className="mx-auto w-full max-w-150 gap-7">
          <Text className="text-muted text-3.75 leading-5.5">
            {t('maintenanceRecord.logDesc')}
          </Text>

          <Card>
            <Card.Body>
              <Card.Title>
                {template?.taskName ?? t('common.loading')}
              </Card.Title>
              <Card.Description>
                {generator?.title ?? t('common.loading')}
              </Card.Description>
            </Card.Body>
          </Card>

          <TextField>
            <Label>{t('maintenanceRecord.notes')}</Label>
            <Input
              testID="record-maintenance-notes-input"
              placeholder={t('maintenanceRecord.notesPlaceholder')}
              value={notesBinding.value}
              onChangeText={notesBinding.onChangeText}
              multiline
            />
            <Description>{t('common.optional')}</Description>
          </TextField>

          <FormError message={formError} />
        </View>
      </KeyboardAwareScrollView>
    </>
  )
}
