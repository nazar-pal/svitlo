import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { FieldError, Input, Label, TextField } from 'heroui-native'
import { Text, View } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormError } from '@/components/form-error'
import { HeaderSubmitButton } from '@/components/navigation/header-submit-button'
import { KeyboardAwareScrollView } from '@/components/uniwind'
import { renameOrganization } from '@/data/client/mutations'
import { getOrganization } from '@/data/client/queries'
import { updateOrganizationSchema } from '@/data/shared/validation'
import { useForm, validateWithZod } from '@/lib/hooks/forms'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useLocalUser } from '@/lib/powersync'

export default function RenameOrganizationScreen() {
  const { id: orgId } = useLocalSearchParams<{ id: string }>()
  const localUser = useLocalUser()
  if (!localUser || !orgId) return null
  return <RenameForm userId={localUser.id} orgId={orgId} />
}

function RenameForm({ userId, orgId }: { userId: string; orgId: string }) {
  const { t } = useTranslation()
  const router = useRouter()
  const { data: orgs } = useDrizzleQuery(getOrganization(orgId))
  const currentName = orgs[0]?.name ?? ''

  const { submit, formError, bind } = useForm({
    initial: { name: currentName },
    shortCircuit: state => !state.isDirty,
    build: values => validateWithZod(updateOrganizationSchema, values),
    mutate: input => renameOrganization(userId, orgId, input),
    onSuccess: () => router.back()
  })

  const nameBinding = bind.text('name')

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => <HeaderSubmitButton onPress={submit} />
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

          <TextField isInvalid={nameBinding.isInvalid}>
            <Label>{t('organization.organizationName')}</Label>
            <Input
              testID="rename-org-name-input"
              placeholder={t('organization.namePlaceholder')}
              value={nameBinding.value}
              onChangeText={nameBinding.onChangeText}
              autoFocus
            />
            <FieldError>{nameBinding.errorMessage}</FieldError>
          </TextField>

          <FormError message={formError} />
        </View>
      </KeyboardAwareScrollView>
    </>
  )
}
