import { DatePicker, Host } from '@expo/ui/swift-ui'
import { useRouter } from 'expo-router'
import { Card } from 'heroui-native'

import { useTranslation } from '@/lib/i18n'
import { ValueFormField } from '@/components/form/form-field'
import { FormScreen } from '@/components/form/form-screen'
import { updateSession } from '@/data/client/mutations'
import type { GeneratorSession } from '@/data/client/db-schema'
import { getGenerator, getGeneratorSession } from '@/data/client/queries'
import { isPolicyAllowed, policies, usePolicy } from '@/data/client/use-policy'
import { useAuthedEntity } from '@/lib/hooks/use-authed-entity'
import { useForm } from '@/lib/hooks/forms'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useResampledNow } from '@/lib/hooks/use-resampled-now'

export default function EditSessionScreen() {
  const loaded = useAuthedEntity(['sessionId'], params =>
    getGeneratorSession(params.sessionId)
  )
  if (!loaded) return null
  return <EditForm userId={loaded.userId} session={loaded.entity} />
}

interface EditFormProps {
  userId: string
  session: GeneratorSession
}

function EditForm({ userId, session }: EditFormProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const { data: generatorData } = useDrizzleQuery(
    getGenerator(session.generatorId)
  )
  const generator = generatorData[0]

  const { form, submit, formError, isSubmitting, bind } = useForm({
    initial: {
      startedAt: new Date(session.startedAt),
      stoppedAt: session.stoppedAt ? new Date(session.stoppedAt) : new Date()
    },
    build: values => {
      if (values.stoppedAt.getTime() <= values.startedAt.getTime())
        return { ok: false, formError: t('validation.endBeforeStart') }
      return {
        ok: true,
        data: {
          startedAt: values.startedAt.toISOString(),
          stoppedAt: values.stoppedAt.toISOString()
        }
      }
    },
    mutate: input => updateSession(userId, session.id, input),
    onSuccess: () => router.back()
  })

  const startedAtISO = form.values.startedAt.toISOString()
  const stoppedAtISO = form.values.stoppedAt.toISOString()
  const now = useResampledNow(stoppedAtISO)
  const policy = usePolicy(policies.sessions.updateSession, {
    userId,
    sessionId: session.id,
    startedAt: startedAtISO,
    stoppedAt: stoppedAtISO,
    now
  })

  return (
    <FormScreen
      variant="scroll"
      onSubmit={submit}
      isSubmitting={isSubmitting}
      submitDisabled={!isPolicyAllowed(policy)}
      formError={formError}
    >
      <Card>
        <Card.Body>
          <Card.Title>{generator?.title ?? ''}</Card.Title>
          <Card.Description>{generator?.model ?? ''}</Card.Description>
        </Card.Body>
      </Card>

      <ValueFormField
        binding={bind.value('startedAt')}
        label={t('edit.startTime')}
      >
        {b => (
          <Host matchContents>
            <DatePicker
              selection={b.value}
              onDateChange={b.onChange}
              displayedComponents={['date', 'hourAndMinute']}
              range={{ end: form.values.stoppedAt }}
            />
          </Host>
        )}
      </ValueFormField>

      <ValueFormField
        binding={bind.value('stoppedAt')}
        label={t('edit.endTime')}
      >
        {b => (
          <Host matchContents>
            <DatePicker
              selection={b.value}
              onDateChange={b.onChange}
              displayedComponents={['date', 'hourAndMinute']}
              range={{ start: form.values.startedAt, end: new Date() }}
            />
          </Host>
        )}
      </ValueFormField>
    </FormScreen>
  )
}
