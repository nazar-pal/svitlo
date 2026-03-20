import { DatePicker, Host } from '@expo/ui/swift-ui'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Card } from 'heroui-native'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { updateSession } from '@/data/client/mutations'
import { getGenerator, getGeneratorSession } from '@/data/client/queries'
import { notifySuccess } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

export default function EditSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>()
  const router = useRouter()
  const localUser = useLocalUser()

  const { data: sessionData } = useDrizzleQuery(
    sessionId ? getGeneratorSession(sessionId) : undefined
  )
  const session = sessionData[0]

  const { data: generatorData } = useDrizzleQuery(
    session ? getGenerator(session.generatorId) : undefined
  )
  const generator = generatorData[0]

  const [startedAt, setStartedAt] = useState<Date | null>(null)
  const [stoppedAt, setStoppedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const effectiveStartedAt =
    startedAt ?? (session ? new Date(session.startedAt) : new Date())
  const effectiveStoppedAt =
    stoppedAt ?? (session?.stoppedAt ? new Date(session.stoppedAt) : new Date())

  async function handleSubmit() {
    if (!localUser || !sessionId) return
    setError('')

    const result = await updateSession(localUser.id, sessionId, {
      startedAt: effectiveStartedAt.toISOString(),
      stoppedAt: effectiveStoppedAt.toISOString()
    })

    if (!result.ok) {
      setError(result.error)
      return
    }

    notifySuccess()
    router.back()
  }

  if (!session) return null

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderSubmitButton onPress={handleSubmit} />
        }}
      />
      <ScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pb-10 pt-6"
      >
        <View className="mx-auto w-full max-w-150 gap-7">
          <Card>
            <Card.Body>
              <Card.Title>{generator?.title ?? ''}</Card.Title>
              <Card.Description>{generator?.model ?? ''}</Card.Description>
            </Card.Body>
          </Card>

          <View className="gap-2">
            <Text className="text-muted ml-1 text-sm font-medium">
              Start Time
            </Text>
            <Host matchContents>
              <DatePicker
                selection={effectiveStartedAt}
                onDateChange={setStartedAt}
                displayedComponents={['date', 'hourAndMinute']}
                range={{ end: effectiveStoppedAt }}
              />
            </Host>
          </View>

          <View className="gap-2">
            <Text className="text-muted ml-1 text-sm font-medium">
              End Time
            </Text>
            <Host matchContents>
              <DatePicker
                selection={effectiveStoppedAt}
                onDateChange={setStoppedAt}
                displayedComponents={['date', 'hourAndMinute']}
                range={{ start: effectiveStartedAt, end: new Date() }}
              />
            </Host>
          </View>

          <FormError message={error} />
        </View>
      </ScrollView>
    </>
  )
}
