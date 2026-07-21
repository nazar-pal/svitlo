import { Alert } from 'react-native'

import type { MutationResult } from '@/data/shared/result'
import { notifyWarning } from '@/lib/haptics'
import { t } from '@/lib/i18n'

import { runMutation } from './run-mutation'

interface ConfirmDestructiveBase {
  confirmLabel?: string
  onCancel?: () => void
}

interface MutationConfirm extends ConfirmDestructiveBase {
  mutation: () => Promise<MutationResult>
  onSuccess?: () => void | Promise<void>
  onConfirm?: never
}

interface PlainConfirm extends ConfirmDestructiveBase {
  mutation?: never
  onSuccess?: never
  onConfirm?: () => void
}

type ConfirmDestructiveOptions = MutationConfirm | PlainConfirm

/**
 * The shared destructive-confirm dialog: a cancel button plus a destructive
 * button that either runs a mutation (via runMutation, which handles errors
 * and fires the warning haptic on success) or fires the warning haptic
 * immediately and invokes a plain onConfirm callback.
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
