import { useLocalSearchParams, useRouter } from 'expo-router'
import { Button, Description, Input, Label, TextField } from 'heroui-native'
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { createInvitation } from '@/data/client/mutations'
import { insertInvitationSchema } from '@/data/client/validation'
import { useLocalUser } from '@/lib/powersync'

export default function InviteMemberScreen() {
  const { id: orgId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const localUser = useLocalUser()

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  async function handleInvite() {
    if (!localUser || !orgId) return
    setError('')

    const input = {
      organizationId: orgId,
      inviteeEmail: email.trim().toLowerCase()
    }

    const parsed = insertInvitationSchema.safeParse(input)
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    const result = await createInvitation(localUser.id, input)
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
            Invite Member
          </Text>
          <Text className="text-muted text-[15px] leading-[22px]">
            Enter the email address of the person you want to invite.
          </Text>
        </View>

        <TextField>
          <Label>Email Address</Label>
          <Input
            placeholder="employee@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoFocus
          />
          <Description>
            The invitation will appear when they sign in with this email
          </Description>
          {error ? (
            <Description className="text-danger">{error}</Description>
          ) : null}
        </TextField>

        <Button variant="primary" onPress={handleInvite}>
          Send Invitation
        </Button>
      </View>
    </ScrollView>
  )
}
