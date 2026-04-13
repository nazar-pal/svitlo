import { useRouter } from 'expo-router'
import { Text } from 'react-native'

import { useTranslation } from '@/lib/i18n'
import { FormField } from '@/components/form/form-field'
import { FormScreen } from '@/components/form/form-screen'
import { useCanCreateInvitation } from '@/data/client/invitations/policy-hooks'
import { createInvitation } from '@/data/client/mutations'
import { isPolicyAllowed } from '@/data/client/policy-hooks-shared'
import { insertInvitationSchema } from '@/data/shared/validation'
import { useAuthedParams } from '@/lib/hooks/use-authed-params'
import { useForm, validateWithZod } from '@/lib/hooks/forms'

export default function InviteMemberScreen() {
  const ctx = useAuthedParams(['id'])
  if (!ctx) return null
  return <InviteForm userId={ctx.userId} orgId={ctx.params.id} />
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

  const normalizedEmail = emailBinding.value.trim().toLowerCase() || undefined
  const policy = useCanCreateInvitation(userId, orgId, normalizedEmail)

  return (
    <FormScreen
      onSubmit={submit}
      isSubmitting={isSubmitting}
      submitDisabled={!isPolicyAllowed(policy)}
      submitIcon="paperplane.fill"
      formError={formError}
    >
      <Text className="text-muted text-3.75 leading-5.5">
        {t('organization.inviteDesc')}
      </Text>

      <FormField
        binding={emailBinding}
        label={t('organization.emailAddress')}
        description={t('organization.inviteHint')}
        testID="invite-email-input"
        placeholder={t('organization.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoFocus
      />
    </FormScreen>
  )
}
