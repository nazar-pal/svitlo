import {
  Button,
  Dialog,
  FieldError,
  Input,
  Label,
  TextField,
  useToast
} from 'heroui-native'
import { useState } from 'react'
import { View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'

import { BlurDialogOverlay } from '@/components/blur-dialog-overlay'
import { deleteOrganization } from '@/data/client/mutations'
import { getOrganization } from '@/data/client/queries'
import { runMutation } from '@/lib/alerts'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { useTranslation } from '@/lib/i18n'
import { useUserOrgs } from '@/lib/organization/use-user-orgs'

interface DeleteOrgDialogProps {
  orgId: string | null
  onClose: () => void
  onDeleted?: () => void
}

export function DeleteOrgDialog({
  orgId,
  onClose,
  onDeleted
}: DeleteOrgDialogProps) {
  const { t } = useTranslation()
  const { userId } = useUserOrgs()
  const { toast } = useToast()
  const { data: orgs } = useDrizzleQuery(
    orgId ? getOrganization(orgId) : undefined
  )
  const orgName = orgs[0]?.name ?? ''

  const [confirmText, setConfirmText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canDelete = confirmText === orgName && orgName.length > 0

  function close() {
    setConfirmText('')
    onClose()
  }

  async function handleDelete() {
    if (!canDelete || isSubmitting || !orgId) return
    setIsSubmitting(true)

    const ok = await runMutation(() => deleteOrganization(userId, orgId), {
      feedback: 'warning',
      onSuccess: () => {
        toast.show({
          variant: 'warning',
          label: t('organization.orgDeleted', { name: orgName })
        })
        onDeleted?.()
      }
    })

    if (ok) close()
    else setIsSubmitting(false)
  }

  return (
    <Dialog
      isOpen={!!orgId}
      onOpenChange={open => {
        if (!open) close()
      }}
    >
      <Dialog.Portal>
        <BlurDialogOverlay />
        <KeyboardAvoidingView behavior="padding">
          <Dialog.Content>
            <Dialog.Close variant="ghost" className="self-end" />
            <View className="gap-5">
              <View className="gap-1.5">
                <Dialog.Title>{t('organization.deleteOrg')}</Dialog.Title>
                <Dialog.Description>
                  {t('organization.deleteOrgDesc')}
                </Dialog.Description>
              </View>

              <TextField isInvalid={confirmText.length > 0 && !canDelete}>
                <Label>
                  {t('organization.typeToConfirm', { name: orgName })}
                </Label>
                <Input
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder={orgName}
                  autoCapitalize="none"
                  autoCorrect={false}
                  variant="secondary"
                />
                {confirmText.length > 0 && !canDelete ? (
                  <FieldError>{t('organization.nameDoesNotMatch')}</FieldError>
                ) : null}
              </TextField>

              <View className="flex-row justify-end gap-3">
                <Button variant="ghost" size="sm" onPress={close}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  isDisabled={!canDelete || isSubmitting}
                  onPress={handleDelete}
                >
                  {t('common.delete')}
                </Button>
              </View>
            </View>
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  )
}
