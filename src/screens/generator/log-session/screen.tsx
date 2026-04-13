import { DatePicker, Host } from '@expo/ui/swift-ui'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Card } from 'heroui-native'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormScreen } from '@/components/form/form-screen'
import { logManualSession } from '@/data/client/mutations'
import { getGenerator } from '@/data/client/queries'
import { useCanLogManualSession } from '@/data/client/sessions/policy-hooks'
import { useForm } from '@/lib/hooks/forms'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

export default function LogSessionScreen() {
  const { id: generatorId } = useLocalSearchParams<{ id: string }>()
  const localUser = useLocalUser()
  if (!localUser || !generatorId) return null
  return <LogSessionForm userId={localUser.id} generatorId={generatorId} />
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

  const policy = useCanLogManualSession(userId, {
    generatorId,
    startedAt: startedAtBinding.value.toISOString(),
    stoppedAt: stoppedAtBinding.value.toISOString()
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
      <Text className="text-muted text-3.75 leading-5.5">
        {t('generator.logSessionDesc')}
      </Text>

      <Card>
        <Card.Body>
          <Card.Title>{generator?.title ?? t('common.loading')}</Card.Title>
          <Card.Description>{generator?.model ?? ''}</Card.Description>
        </Card.Body>
      </Card>

      <View className="gap-2">
        <Text className="text-muted ml-1 text-sm font-medium">
          {t('generator.startTime')}
        </Text>
        <Host matchContents>
          <DatePicker
            selection={startedAtBinding.value}
            onDateChange={startedAtBinding.onChange}
            displayedComponents={['date', 'hourAndMinute']}
            range={{ end: stoppedAtBinding.value }}
          />
        </Host>
      </View>

      <View className="gap-2">
        <Text className="text-muted ml-1 text-sm font-medium">
          {t('generator.endTime')}
        </Text>
        <Host matchContents>
          <DatePicker
            selection={stoppedAtBinding.value}
            onDateChange={stoppedAtBinding.onChange}
            displayedComponents={['date', 'hourAndMinute']}
            range={{ start: startedAtBinding.value, end: new Date() }}
          />
        </Host>
      </View>
    </FormScreen>
  )
}
