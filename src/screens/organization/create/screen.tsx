import { Stack, useRouter } from 'expo-router'
import { FieldError, Input, Label, TextField } from 'heroui-native'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { createOrganization } from '@/data/client/mutations'
import { insertOrganizationSchema } from '@/data/client/validation'
import { notifySuccess } from '@/lib/haptics'
import { useLocalUser } from '@/lib/powersync'

export default function CreateOrganizationScreen() {
  const { t } = useTranslation()
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

    notifySuccess()
    router.back()
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderSubmitButton onPress={handleCreate} />
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
            {t('organization.createDesc')}
          </Text>

          <TextField isInvalid={!!error}>
            <Label>{t('organization.organizationName')}</Label>
            <Input
              placeholder={t('organization.namePlaceholder')}
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <FieldError>{error}</FieldError>
          </TextField>
        </View>
      </KeyboardAwareScrollView>
    </>
  )
}
