import { useRouter } from 'expo-router'
import { Card } from 'heroui-native'
import { Text } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormField } from '@/components/form/form-field'
import { FormScreen } from '@/components/form/form-screen'
import { recordMaintenance } from '@/data/client/mutations'
import { getGenerator, getMaintenanceTemplate } from '@/data/client/queries'
import { useAuthedParams } from '@/lib/hooks/use-authed-params'
import { useForm } from '@/lib/hooks/forms'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'

export default function RecordMaintenanceScreen() {
  const ctx = useAuthedParams(['id', 'templateId'])
  if (!ctx) return null
  return (
    <RecordForm
      userId={ctx.userId}
      generatorId={ctx.params.id}
      templateId={ctx.params.templateId}
    />
  )
}

interface RecordFormProps {
  userId: string
  generatorId: string
  templateId: string
}

function RecordForm({ userId, generatorId, templateId }: RecordFormProps) {
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
    <FormScreen
      onSubmit={submit}
      isSubmitting={isSubmitting}
      formError={formError}
    >
      <Text className="text-muted text-3.75 leading-5.5">
        {t('maintenanceRecord.logDesc')}
      </Text>

      <Card>
        <Card.Body>
          <Card.Title>{template?.taskName ?? t('common.loading')}</Card.Title>
          <Card.Description>
            {generator?.title ?? t('common.loading')}
          </Card.Description>
        </Card.Body>
      </Card>

      <FormField
        binding={notesBinding}
        label={t('maintenanceRecord.notes')}
        description={t('common.optional')}
        testID="record-maintenance-notes-input"
        placeholder={t('maintenanceRecord.notesPlaceholder')}
        multiline
      />
    </FormScreen>
  )
}
