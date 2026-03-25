import {
  Button,
  Dialog,
  FieldError,
  Input,
  Label,
  TextField
} from 'heroui-native'
import { useState } from 'react'
import { View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'

import { BlurDialogOverlay } from '@/components/blur-dialog-overlay'
import { useTranslation } from '@/lib/i18n'

interface ConfirmDeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  label: string
  placeholder: string
  errorMessage: string
  deleteLabel: string
  autoCapitalize?: 'none' | 'characters'
  isMatch: (text: string) => boolean
  onDelete: () => Promise<void>
}

export function ConfirmDeleteDialog({
  isOpen,
  onClose,
  title,
  description,
  label,
  placeholder,
  errorMessage,
  deleteLabel,
  autoCapitalize = 'none',
  isMatch,
  onDelete
}: ConfirmDeleteDialogProps) {
  const { t } = useTranslation()
  const [confirmText, setConfirmText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canDelete = isMatch(confirmText)

  function close() {
    setConfirmText('')
    onClose()
  }

  async function handleDelete() {
    if (!canDelete || isSubmitting) return
    setIsSubmitting(true)

    try {
      await onDelete()
      close()
    } catch {
      // caller threw — keep dialog open
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      isOpen={isOpen}
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
                <Dialog.Title>{title}</Dialog.Title>
                <Dialog.Description>{description}</Dialog.Description>
              </View>

              <TextField isInvalid={confirmText.length > 0 && !canDelete}>
                <Label>{label}</Label>
                <Input
                  value={confirmText}
                  onChangeText={setConfirmText}
                  placeholder={placeholder}
                  autoCapitalize={autoCapitalize}
                  autoCorrect={false}
                  variant="secondary"
                />
                {confirmText.length > 0 && !canDelete ? (
                  <FieldError>{errorMessage}</FieldError>
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
                  {deleteLabel}
                </Button>
              </View>
            </View>
          </Dialog.Content>
        </KeyboardAvoidingView>
      </Dialog.Portal>
    </Dialog>
  )
}
