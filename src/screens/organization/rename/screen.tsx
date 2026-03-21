import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { FieldError, Input, Label, TextField } from 'heroui-native'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { renameOrganization } from '@/data/client/mutations'
import { getOrganization } from '@/data/client/queries'
import { updateOrganizationSchema } from '@/data/client/validation'
import { notifySuccess } from '@/lib/haptics'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

export default function RenameOrganizationScreen() {
  const { t } = useTranslation()
  const { id: orgId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const localUser = useLocalUser()

  const { data: orgs } = useDrizzleQuery(getOrganization(orgId!))
  const currentName = orgs[0]?.name ?? ''

  const [name, setName] = useState<string | null>(null)
  const [error, setError] = useState('')

  const displayName = name ?? currentName

  async function handleRename() {
    if (!localUser || !orgId) return
    // Dismiss without mutation when nothing changed
    if (displayName === currentName) return router.back()
    setError('')

    const parsed = updateOrganizationSchema.safeParse({ name: displayName })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }

    const result = await renameOrganization(localUser.id, orgId, {
      name: displayName
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
      <Stack.Screen
        options={{
          headerRight: () => <HeaderSubmitButton onPress={handleRename} />
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
            {t('organization.renameDesc')}
          </Text>

          <TextField isInvalid={!!error}>
            <Label>{t('organization.organizationName')}</Label>
            <Input
              placeholder={t('organization.namePlaceholder')}
              value={displayName}
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
