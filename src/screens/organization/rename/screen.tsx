import { useLocalSearchParams, useRouter } from 'expo-router'
import { Text } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormField } from '@/components/form/form-field'
import { FormScreen } from '@/components/form/form-screen'
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

  const { submit, formError, isSubmitting, bind } = useForm({
    initial: { name: currentName },
    shortCircuit: state => !state.isDirty,
    build: values => validateWithZod(updateOrganizationSchema, values),
    mutate: input => renameOrganization(userId, orgId, input),
    onSuccess: () => router.back()
  })

  const nameBinding = bind.text('name')

  return (
    <FormScreen
      onSubmit={submit}
      isSubmitting={isSubmitting}
      formError={formError}
    >
      <Text className="text-muted text-3.75 leading-5.5">
        {t('organization.renameDesc')}
      </Text>

      <FormField
        binding={nameBinding}
        label={t('organization.organizationName')}
        testID="rename-org-name-input"
        placeholder={t('organization.namePlaceholder')}
        autoFocus
      />
    </FormScreen>
  )
}
