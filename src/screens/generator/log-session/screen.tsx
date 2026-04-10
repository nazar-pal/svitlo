import { DatePicker, Host } from '@expo/ui/swift-ui'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Card } from 'heroui-native'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { logManualSession } from '@/data/client/mutations'
import { getGenerator } from '@/data/client/queries'
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

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderSubmitButton onPress={submit} isDisabled={isSubmitting} />
          )
        }}
      />
      <ScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pb-10 pt-6"
      >
        <View className="mx-auto w-full max-w-150 gap-7">
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

          <FormError message={formError} />
        </View>
      </ScrollView>
    </>
  )
}
