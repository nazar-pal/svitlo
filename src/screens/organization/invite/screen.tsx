import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  TextField
} from 'heroui-native'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { KeyboardAwareScrollView } from '@/components/uniwind'
import { createInvitation } from '@/data/client/mutations'
import { notifySuccess } from '@/lib/haptics'
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

    notifySuccess()
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
      <View className="mx-auto w-full max-w-150 gap-7">
        <View className="gap-2">
          <Text className="text-foreground text-3xl font-bold">
            Invite Member
          </Text>
          <Text className="text-muted text-3.75 leading-5.5">
            Enter the email address of the person you want to invite.
          </Text>
        </View>

        <TextField isInvalid={!!error}>
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
          <FieldError>{error}</FieldError>
        </TextField>

        <Button variant="primary" onPress={handleInvite}>
          Send Invitation
        </Button>
      </View>
    </KeyboardAwareScrollView>
  )
}
