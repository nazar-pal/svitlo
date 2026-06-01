import { Alert } from 'react-native'

import type { MutationResult } from '@/data/shared/result'
import { notifyWarning } from '@/lib/haptics'
import { t } from '@/lib/i18n'

import { runMutation } from './run-mutation'

interface ConfirmDestructiveOptions {
  confirmLabel?: string
  mutation?: () => Promise<MutationResult>
  onSuccess?: () => void | Promise<void>
  onConfirm?: () => void
  onCancel?: () => void
}

/**
 * The shared destructive-confirm dialog: a cancel button plus a destructive
 * button that fires the warning haptic and then either runs a mutation
 * (with error handling + onSuccess) or invokes a plain onConfirm callback.
 */
export function confirmDestructive(
  title: string,
  message: string,
  {
    confirmLabel = t('common.delete'),
    mutation,
    onSuccess,
    onConfirm,
    onCancel
  }: ConfirmDestructiveOptions = {}
) {
  Alert.alert(title, message, [
    { text: t('common.cancel'), style: 'cancel', onPress: onCancel },
    {
      text: confirmLabel,
      style: 'destructive',
      onPress: () => {
        if (mutation) {
          void runMutation(mutation, { feedback: 'warning', onSuccess })
          return
        }
        notifyWarning()
        onConfirm?.()
      }
    }
  ])
}
