import { DatePicker, Host } from '@expo/ui/swift-ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Card, TextArea } from 'heroui-native'
import { Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormScreen } from '@/components/form/form-screen'
import { updateMaintenanceRecord } from '@/data/client/mutations'
import type { MaintenanceRecord } from '@/data/client/db-schema/maintenance'
import {
  getGenerator,
  getMaintenanceRecord,
  getMaintenanceTemplate
} from '@/data/client/queries'
import { useForm } from '@/lib/hooks/forms'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

export default function EditMaintenanceScreen() {
  const { recordId } = useLocalSearchParams<{ recordId: string }>()
  const localUser = useLocalUser()
  const { data: recordData } = useDrizzleQuery(
    recordId ? getMaintenanceRecord(recordId) : undefined
  )
  const record = recordData[0]
  if (!localUser || !record) return null
  return <EditForm userId={localUser.id} record={record} />
}

interface EditFormProps {
  userId: string
  record: MaintenanceRecord
}

function EditForm({ userId, record }: EditFormProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const { data: generatorData } = useDrizzleQuery(
    getGenerator(record.generatorId)
  )
  const generator = generatorData[0]

  const { data: templateData } = useDrizzleQuery(
    getMaintenanceTemplate(record.templateId)
  )
  const template = templateData[0]

  const { form, submit, formError, isSubmitting } = useForm({
    initial: {
      performedAt: new Date(record.performedAt),
      notes: record.notes ?? ''
    },
    build: values => ({
      ok: true,
      data: {
        performedAt: values.performedAt.toISOString(),
        notes: values.notes || null
      }
    }),
    mutate: input => updateMaintenanceRecord(userId, record.id, input),
    onSuccess: () => router.back()
  })

  return (
    <FormScreen
      onSubmit={submit}
      isSubmitting={isSubmitting}
      formError={formError}
    >
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
            selection={form.values.performedAt}
            onDateChange={v => form.set('performedAt', v)}
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
          value={form.values.notes}
          onChangeText={v => form.set('notes', v)}
          placeholder={t('edit.optionalNotes')}
        />
      </View>
    </FormScreen>
  )
}
