import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Card } from 'heroui-native'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { DatePicker, Host } from '@expo/ui/swift-ui'

import { FormError } from '@/components/form-error'
import { logManualSession } from '@/data/client/mutations'
import { notifySuccess } from '@/lib/haptics'
import { getGenerator } from '@/data/client/queries'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

export default function LogSessionScreen() {
  const { generatorId } = useLocalSearchParams<{ generatorId: string }>()
  const router = useRouter()
  const localUser = useLocalUser()

  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  const [startedAt, setStartedAt] = useState(oneHourAgo)
  const [stoppedAt, setStoppedAt] = useState(now)
  const [error, setError] = useState('')

  const { data: generatorData } = useDrizzleQuery(
    generatorId ? getGenerator(generatorId) : undefined
  )
  const generator = generatorData[0]

  async function handleSubmit() {
    if (!localUser || !generatorId) return
    setError('')

    const result = await logManualSession(localUser.id, {
      generatorId,
      startedAt: startedAt.toISOString(),
      stoppedAt: stoppedAt.toISOString()
    })

    if (!result.ok) {
      setError(result.error)
      return
    }

    notifySuccess()
    router.back()
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Log Past Run' }} />
      <ScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pb-10 pt-6"
      >
        <View className="mx-auto w-full max-w-150 gap-7">
          <View className="gap-2">
            <Text className="text-foreground text-3xl font-bold">
              Log Past Run
            </Text>
            <Text className="text-muted text-3.75 leading-5.5">
              Retroactively record a generator run by specifying the start and
              end times.
            </Text>
          </View>

          {/* Generator info */}
          <Card>
            <Card.Body>
              <Card.Title>{generator?.title ?? 'Loading...'}</Card.Title>
              <Card.Description>{generator?.model ?? ''}</Card.Description>
            </Card.Body>
          </Card>

          {/* Start time */}
          <View className="gap-2">
            <Text className="text-muted ml-1 text-sm font-medium">
              Start Time
            </Text>
            <Host matchContents>
              <DatePicker
                selection={startedAt}
                onDateChange={setStartedAt}
                displayedComponents={['date', 'hourAndMinute']}
                range={{ end: new Date() }}
              />
            </Host>
          </View>

          {/* End time */}
          <View className="gap-2">
            <Text className="text-muted ml-1 text-sm font-medium">
              End Time
            </Text>
            <Host matchContents>
              <DatePicker
                selection={stoppedAt}
                onDateChange={setStoppedAt}
                displayedComponents={['date', 'hourAndMinute']}
                range={{ end: new Date() }}
              />
            </Host>
          </View>

          <FormError message={error} />

          <Button variant="primary" onPress={handleSubmit}>
            Log Session
          </Button>
        </View>
      </ScrollView>
    </>
  )
}
