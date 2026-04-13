import { DatePicker, Host } from '@expo/ui/swift-ui'
import { useRouter } from 'expo-router'
import { Card, TextArea } from 'heroui-native'

import { useTranslation } from '@/lib/i18n'
import { ValueFormField } from '@/components/form/form-field'
import { FormScreen } from '@/components/form/form-screen'
import { updateMaintenanceRecord } from '@/data/client/mutations'
import type { MaintenanceRecord } from '@/data/client/db-schema/maintenance'
import {
  getGenerator,
  getMaintenanceRecord,
  getMaintenanceTemplate
} from '@/data/client/queries'
import { useAuthedParams } from '@/lib/hooks/use-authed-params'
import { useForm } from '@/lib/hooks/forms'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'

export default function EditMaintenanceScreen() {
  const ctx = useAuthedParams(['recordId'])

  const { data: recordData } = useDrizzleQuery(
    ctx ? getMaintenanceRecord(ctx.params.recordId) : undefined
  )
  const record = recordData[0]

  if (!ctx || !record) return null

  return <EditForm userId={ctx.userId} record={record} />
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

  const { submit, formError, isSubmitting, bind } = useForm({
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

      <ValueFormField
        binding={bind.value('performedAt')}
        label={t('edit.performedAt')}
      >
        {b => (
          <Host matchContents>
            <DatePicker
              selection={b.value}
              onDateChange={b.onChange}
              displayedComponents={['date', 'hourAndMinute']}
              range={{ end: new Date() }}
            />
          </Host>
        )}
      </ValueFormField>

      <ValueFormField binding={bind.value('notes')} label={t('edit.notes')}>
        {b => (
          <TextArea
            value={b.value}
            onChangeText={b.onChange}
            placeholder={t('edit.optionalNotes')}
          />
        )}
      </ValueFormField>
    </FormScreen>
  )
}
