import { DatePicker, Host } from '@expo/ui/swift-ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Card } from 'heroui-native'
import { Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormScreen } from '@/components/form/form-screen'
import { updateSession } from '@/data/client/mutations'
import type { GeneratorSession } from '@/data/client/db-schema'
import { getGenerator, getGeneratorSession } from '@/data/client/queries'
import { useCanUpdateSession } from '@/data/client/sessions/policy-hooks'
import { useForm } from '@/lib/hooks/forms'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

export default function EditSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  const localUser = useLocalUser()
  const { data: sessionData } = useDrizzleQuery(
    sessionId ? getGeneratorSession(sessionId) : undefined
  )
  const session = sessionData[0]
  if (!localUser || !session) return null
  return <EditForm userId={localUser.id} session={session} />
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

  const { form, submit, formError, isSubmitting } = useForm({
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

  const policy = useCanUpdateSession(userId, session.id, {
    startedAt: form.values.startedAt.toISOString(),
    stoppedAt: form.values.stoppedAt.toISOString()
  })
  const submitDisabled = policy.status === 'loading' || !policy.ok

  return (
    <FormScreen
      variant="scroll"
      onSubmit={submit}
      isSubmitting={isSubmitting}
      submitDisabled={submitDisabled}
      formError={formError}
    >
      <Card>
        <Card.Body>
          <Card.Title>{generator?.title ?? ''}</Card.Title>
          <Card.Description>{generator?.model ?? ''}</Card.Description>
        </Card.Body>
      </Card>

      <View className="gap-2">
        <Text className="text-muted ml-1 text-sm font-medium">
          {t('edit.startTime')}
        </Text>
        <Host matchContents>
          <DatePicker
            selection={form.values.startedAt}
            onDateChange={v => form.set('startedAt', v)}
            displayedComponents={['date', 'hourAndMinute']}
            range={{ end: form.values.stoppedAt }}
          />
        </Host>
      </View>

      <View className="gap-2">
        <Text className="text-muted ml-1 text-sm font-medium">
          {t('edit.endTime')}
        </Text>
        <Host matchContents>
          <DatePicker
            selection={form.values.stoppedAt}
            onDateChange={v => form.set('stoppedAt', v)}
            displayedComponents={['date', 'hourAndMinute']}
            range={{ start: form.values.startedAt, end: new Date() }}
          />
        </Host>
      </View>
    </FormScreen>
  )
}
