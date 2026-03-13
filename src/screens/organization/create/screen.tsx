import { useRouter } from 'expo-router'
import { Button, Description, Input, Label, TextField } from 'heroui-native'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { createOrganization } from '@/data/client/mutations'
import { insertOrganizationSchema } from '@/data/client/validation'
import { useLocalUser } from '@/lib/powersync'

export default function CreateOrganizationScreen() {
  const router = useRouter()
  const localUser = useLocalUser()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!localUser) return
    setError('')

    const parsed = insertOrganizationSchema.safeParse({ name })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    const result = await createOrganization(localUser.id, { name })
    if (!result.ok) {
      setError(result.error)
      return
    }

    router.back()
  }

  return (
    <ScrollView
      className="bg-background flex-1"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="px-5 pb-10 pt-6"
    >
      <View className="mx-auto w-full max-w-[600px] gap-7">
        <View className="gap-2">
          <Text className="text-foreground text-3xl font-bold">
            New Organization
          </Text>
          <Text className="text-muted text-[15px] leading-[22px]">
            Create an organization to start managing generators.
          </Text>
        </View>

        <TextField>
          <Label>Organization Name</Label>
          <Input
            placeholder="e.g. My Workshop"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          {error ? (
            <Description className="text-danger">{error}</Description>
          ) : null}
        </TextField>

        <Button variant="primary" onPress={handleCreate}>
          Create Organization
        </Button>
      </View>
    </ScrollView>
  )
}
