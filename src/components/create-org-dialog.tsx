import { BlurView } from 'expo-blur'
import {
  Button,
  Dialog,
  FieldError,
  Input,
  Label,
  TextField
} from 'heroui-native'
import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'

import { createOrganization } from '@/data/client/mutations'
import { insertOrganizationSchema } from '@/data/client/validation'
import { notifySuccess } from '@/lib/haptics'
import { useTranslation } from '@/lib/i18n'
import { useLocalUser } from '@/lib/powersync'

interface CreateOrgDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateOrgDialog({ isOpen, onClose }: CreateOrgDialogProps) {
  const { t } = useTranslation()
  const localUser = useLocalUser()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function close() {
    setName('')
    setError('')
    onClose()
  }

  async function handleCreate() {
    if (!localUser || isSubmitting) return
    setIsSubmitting(true)
    setError('')

    const parsed = insertOrganizationSchema.safeParse({ name })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      setIsSubmitting(false)
      return
    }

    const result = await createOrganization(localUser.id, { name })
    if (!result.ok) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }

    notifySuccess()
    close()
  }

  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) close()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay>
          <BlurView
            tint="systemMaterial"
            intensity={20}
            style={StyleSheet.absoluteFill}
          />
        </Dialog.Overlay>
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

              <TextField isInvalid={!!error}>
                <Label>{t('organization.organizationName')}</Label>
                <Input
                  placeholder={t('organization.namePlaceholder')}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  variant="secondary"
                />
                {error ? <FieldError>{error}</FieldError> : null}
              </TextField>

              <View className="flex-row justify-end gap-3">
                <Button variant="ghost" size="sm" onPress={close}>
                  {t('common.cancel')}
                </Button>
                <Button
                  size="sm"
                  isDisabled={isSubmitting}
                  onPress={handleCreate}
                >
                  {t('common.create')}
                </Button>
              </View>
            </View>
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  )
}
