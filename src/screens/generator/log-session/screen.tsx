import { DatePicker, Host } from '@expo/ui/swift-ui'
import { useRouter } from 'expo-router'
import { Card } from 'heroui-native'
import { useState } from 'react'
import { Text } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { ValueFormField } from '@/components/form/form-field'
import { FormScreen } from '@/components/form/form-screen'
import { logManualSession } from '@/data/client/mutations'
import { getGenerator } from '@/data/client/queries'
import { isPolicyAllowed, policies, usePolicy } from '@/data/client/use-policy'
import { useAuthedParams } from '@/lib/hooks/use-authed-params'
import { useForm } from '@/lib/hooks/forms'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useResampledNow } from '@/lib/hooks/use-resampled-now'

export default function LogSessionScreen() {
  const ctx = useAuthedParams(['id'])
  if (!ctx) return null
  return <LogSessionForm userId={ctx.userId} generatorId={ctx.params.id} />
}

function LogSessionForm({
  userId,
  generatorId
}: {
  userId: string
  generatorId: string
}) {
  const { t } = useTranslation()
  const router = useRouter()

  const { data: generatorData } = useDrizzleQuery(getGenerator(generatorId))
  const generator = generatorData[0]

  const [initialRange] = useState(() => {
    const now = new Date()
    return {
      startedAt: new Date(now.getTime() - 60 * 60 * 1000),
      stoppedAt: now
    }
  })

  const { submit, formError, isSubmitting, bind } = useForm({
    initial: initialRange,
    build: values => {
      if (values.stoppedAt.getTime() <= values.startedAt.getTime())
        return { ok: false, formError: t('validation.endBeforeStart') }
      return {
        ok: true,
        data: {
          generatorId,
          startedAt: values.startedAt.toISOString(),
          stoppedAt: values.stoppedAt.toISOString()
        }
      }
    },
    mutate: input => logManualSession(userId, input),
    onSuccess: () => router.back()
  })

  const startedAtBinding = bind.value('startedAt')
  const stoppedAtBinding = bind.value('stoppedAt')

  const startedAtISO = startedAtBinding.value.toISOString()
  const stoppedAtISO = stoppedAtBinding.value.toISOString()
  const now = useResampledNow(stoppedAtISO)
  const policy = usePolicy(policies.sessions.logManualSession, {
    userId,
    generatorId,
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
      <Text className="text-muted text-3.75 leading-5.5">
        {t('generator.logSessionDesc')}
      </Text>

      <Card>
        <Card.Body>
          <Card.Title>{generator?.title ?? t('common.loading')}</Card.Title>
          <Card.Description>{generator?.model ?? ''}</Card.Description>
        </Card.Body>
      </Card>

      <ValueFormField
        binding={startedAtBinding}
        label={t('generator.startTime')}
      >
        {b => (
          <Host matchContents>
            <DatePicker
              selection={b.value}
              onDateChange={b.onChange}
              displayedComponents={['date', 'hourAndMinute']}
              range={{ end: stoppedAtBinding.value }}
            />
          </Host>
        )}
      </ValueFormField>

      <ValueFormField binding={stoppedAtBinding} label={t('generator.endTime')}>
        {b => (
          <Host matchContents>
            <DatePicker
              selection={b.value}
              onDateChange={b.onChange}
              displayedComponents={['date', 'hourAndMinute']}
              range={{ start: startedAtBinding.value, end: new Date() }}
            />
          </Host>
        )}
      </ValueFormField>
    </FormScreen>
  )
}
