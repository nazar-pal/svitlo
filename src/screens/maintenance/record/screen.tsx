import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  Alert as HeroAlert,
  Button,
  Card,
  Description,
  Input,
  Label,
  TextField
} from 'heroui-native'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { KeyboardAwareScrollView } from '@/components/uniwind'
import { recordMaintenance } from '@/data/client/mutations'
import { getGenerator, getMaintenanceTemplate } from '@/data/client/queries'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

export default function RecordMaintenanceScreen() {
  const { templateId, generatorId } = useLocalSearchParams<{
    templateId: string
    generatorId: string
  }>()
  const router = useRouter()
  const localUser = useLocalUser()

  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  // Template info
  const { data: templateData } = useDrizzleQuery(
    templateId ? getMaintenanceTemplate(templateId) : undefined
  )
  const template = templateData[0]

  // Generator info
  const { data: generatorData } = useDrizzleQuery(
    generatorId ? getGenerator(generatorId) : undefined
  )
  const generator = generatorData[0]

  async function handleRecord() {
    if (!localUser || !templateId || !generatorId) return
    setError('')

    const result = await recordMaintenance(localUser.id, {
      templateId,
      generatorId,
      notes: notes || undefined
    })

    if (!result.ok) {
      setError(result.error)
      return
    }

    router.back()
  }

  return (
    <KeyboardAwareScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10 pt-6"
      keyboardShouldPersistTaps="handled"
      bottomOffset={16}
    >
      <View className="mx-auto w-full max-w-[600px] gap-7">
        <View className="gap-2">
          <Text className="text-foreground text-3xl font-bold">
            Record Maintenance
          </Text>
          <Text className="text-muted text-[15px] leading-[22px]">
            Log that this maintenance work has been completed.
          </Text>
        </View>

        {/* Read-only info */}
        <Card>
          <Card.Body>
            <Card.Title>{template?.taskName ?? 'Loading...'}</Card.Title>
            <Card.Description>
              {generator?.title ?? 'Loading...'}
            </Card.Description>
          </Card.Body>
        </Card>

        <TextField>
          <Label>Notes</Label>
          <Input
            placeholder="Any observations or details..."
            value={notes}
            onChangeText={setNotes}
            multiline
          />
          <Description>Optional</Description>
        </TextField>

        {error ? (
          <HeroAlert status="danger">
            <HeroAlert.Indicator />
            <HeroAlert.Content>
              <HeroAlert.Description>{error}</HeroAlert.Description>
            </HeroAlert.Content>
          </HeroAlert>
        ) : null}

        <Button variant="primary" onPress={handleRecord}>
          Log Maintenance
        </Button>
      </View>
    </KeyboardAwareScrollView>
  )
}
