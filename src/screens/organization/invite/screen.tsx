import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Description, FieldError, Input, Label, TextField } from 'heroui-native'
import { Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { createInvitation } from '@/data/client/mutations'
import { insertInvitationSchema } from '@/data/client/validation'
import { useForm, validateWithZod } from '@/lib/hooks/forms'
import { useLocalUser } from '@/lib/powersync'

export default function InviteMemberScreen() {
  const { id: orgId } = useLocalSearchParams<{ id: string }>()
  const localUser = useLocalUser()
  if (!localUser || !orgId) return null
  return <InviteForm userId={localUser.id} orgId={orgId} />
}

function InviteForm({ userId, orgId }: { userId: string; orgId: string }) {
  const { t } = useTranslation()
  const router = useRouter()

  const { submit, formError, isSubmitting, bind } = useForm({
    initial: { inviteeEmail: '' },
    build: values =>
      validateWithZod(insertInvitationSchema, {
        organizationId: orgId,
        inviteeEmail: values.inviteeEmail.trim().toLowerCase()
      }),
    mutate: input => createInvitation(userId, input),
    onSuccess: () => router.back()
  })

  const emailBinding = bind.text('inviteeEmail')

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderSubmitButton
              systemImage="paperplane.fill"
              onPress={submit}
              isDisabled={isSubmitting}
            />
          )
        }}
      />
      <KeyboardAwareScrollView
        className="bg-background flex-1"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="px-5 pb-10 pt-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={16}
      >
        <View className="mx-auto w-full max-w-150 gap-7">
          <Text className="text-muted text-3.75 leading-5.5">
            {t('organization.inviteDesc')}
          </Text>

          <TextField isInvalid={emailBinding.isInvalid}>
            <Label>{t('organization.emailAddress')}</Label>
            <Input
              testID="invite-email-input"
              placeholder={t('organization.emailPlaceholder')}
              value={emailBinding.value}
              onChangeText={emailBinding.onChangeText}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            <Description>{t('organization.inviteHint')}</Description>
            <FieldError>{emailBinding.errorMessage}</FieldError>
          </TextField>

          <FormError message={formError} />
        </View>
      </KeyboardAwareScrollView>
    </>
  )
}
