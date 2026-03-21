import { DatePicker, Host } from '@expo/ui/swift-ui'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Card, TextArea } from 'heroui-native'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { updateMaintenanceRecord } from '@/data/client/mutations'
import {
  getGenerator,
  getMaintenanceRecord,
  getMaintenanceTemplate
} from '@/data/client/queries'
import { notifySuccess } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

export default function EditMaintenanceScreen() {
  const { t } = useTranslation()
  const { recordId } = useLocalSearchParams<{ recordId: string }>()
  const router = useRouter()
  const localUser = useLocalUser()

  const { data: recordData } = useDrizzleQuery(
    recordId ? getMaintenanceRecord(recordId) : undefined
  )
  const record = recordData[0]

  const { data: generatorData } = useDrizzleQuery(
    record ? getGenerator(record.generatorId) : undefined
  )
  const generator = generatorData[0]

  const { data: templateData } = useDrizzleQuery(
    record ? getMaintenanceTemplate(record.templateId) : undefined
  )
  const template = templateData[0]

  const [performedAt, setPerformedAt] = useState<Date | null>(null)
  const [notes, setNotes] = useState<string | null>(null)
  const [error, setError] = useState('')

  const effectivePerformedAt =
    performedAt ?? (record ? new Date(record.performedAt) : new Date())
  const effectiveNotes = notes ?? record?.notes ?? ''

  async function handleSubmit() {
    if (!localUser || !recordId) return
    setError('')

    const result = await updateMaintenanceRecord(localUser.id, recordId, {
      performedAt: effectivePerformedAt.toISOString(),
      notes: effectiveNotes || null
    })

    if (!result.ok) {
      setError(result.error)
      return
    }

    notifySuccess()
    router.back()
  }

  if (!record) return null

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderSubmitButton onPress={handleSubmit} />
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
          <Card>
            <Card.Body>
              <Card.Title>{generator?.title ?? ''}</Card.Title>
              <Card.Description>{template?.taskName ?? ''}</Card.Description>
            </Card.Body>
          </Card>

          <View className="gap-2">
            <Text className="text-muted ml-1 text-sm font-medium">
              {t('edit.performedAt')}
            </Text>
            <Host matchContents>
              <DatePicker
                selection={effectivePerformedAt}
                onDateChange={setPerformedAt}
                displayedComponents={['date', 'hourAndMinute']}
                range={{ end: new Date() }}
              />
            </Host>
          </View>

          <View className="gap-2">
            <Text className="text-muted ml-1 text-sm font-medium">
              {t('edit.notes')}
            </Text>
            <TextArea
              value={effectiveNotes}
              onChangeText={setNotes}
              placeholder={t('edit.optionalNotes')}
            />
          </View>

          <FormError message={error} />
        </View>
      </KeyboardAwareScrollView>
    </>
  )
}
