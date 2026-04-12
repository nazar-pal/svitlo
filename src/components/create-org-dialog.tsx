import {
  Button,
  Dialog,
  FieldError,
  Input,
  Label,
  TextField
} from 'heroui-native'
import { View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'

import { BlurDialogOverlay } from '@/components/blur-dialog-overlay'
import { FormError } from '@/components/form-error'

import { createOrganization } from '@/data/client/mutations'
import { insertOrganizationSchema } from '@/data/shared/validation'
import { useForm, validateWithZod } from '@/lib/hooks/forms'
import { useTranslation } from '@/lib/i18n'
import { useLocalUser } from '@/lib/powersync'

interface CreateOrgDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateOrgDialog({ isOpen, onClose }: CreateOrgDialogProps) {
  const localUser = useLocalUser()

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) onClose()
      }}
    >
      <Dialog.Portal>
        <BlurDialogOverlay />
        {localUser ? (
          <DialogBody userId={localUser.id} onClose={onClose} />
        ) : null}
      </Dialog.Portal>
    </Dialog>
  )
}

function DialogBody({
  userId,
  onClose
}: {
  userId: string
  onClose: () => void
}) {
  const { t } = useTranslation()

  const { submit, formError, isSubmitting, bind, form } = useForm({
    initial: { name: '' },
    build: values => validateWithZod(insertOrganizationSchema, values),
    mutate: input => createOrganization(userId, input),
    onSuccess: () => close()
  })

  function close() {
    form.reset()
    onClose()
  }

  const nameBinding = bind.text('name')

  return (
    <KeyboardAvoidingView behavior="padding">
      <Dialog.Content>
        <Dialog.Close variant="ghost" className="self-end" />
        <View className="gap-5">
          <View className="gap-1.5">
            <Dialog.Title>{t('screens.newOrganization')}</Dialog.Title>
            <Dialog.Description>
              {t('organization.createDesc')}
            </Dialog.Description>
          </View>

          <TextField isInvalid={nameBinding.isInvalid}>
            <Label>{t('organization.organizationName')}</Label>
            <Input
              testID="create-org-name-input"
              placeholder={t('organization.namePlaceholder')}
              value={nameBinding.value}
              onChangeText={nameBinding.onChangeText}
              autoFocus
              variant="secondary"
            />
            <FieldError>{nameBinding.errorMessage}</FieldError>
          </TextField>

          <FormError message={formError} />

          <View className="flex-row justify-end gap-3">
            <Button variant="ghost" size="sm" onPress={close}>
              {t('common.cancel')}
            </Button>
            <Button
              testID="create-org-submit"
              size="sm"
              isDisabled={isSubmitting}
              onPress={submit}
            >
              {t('common.create')}
            </Button>
          </View>
        </View>
      </Dialog.Content>
    </KeyboardAvoidingView>
  )
}
