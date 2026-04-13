import { Alert } from 'react-native'

import type { MutationResult } from '@/data/shared/result'
import { notifySuccess, notifyWarning } from '@/lib/haptics'
import { t } from '@/lib/i18n'
import { translateMutationError } from '@/lib/i18n/translate-mutation-error'

type Feedback = 'success' | 'warning' | 'none'

interface RunMutationOptions {
  feedback?: Feedback
  onSuccess?: () => void | Promise<void>
}

export async function runMutation(
  mutation: () => Promise<MutationResult>,
  options: RunMutationOptions = {}
): Promise<boolean> {
  const result = await mutation()
  if (!result.ok) {
    Alert.alert(t('common.error'), translateMutationError(result.error))
    return false
  }
  const feedback = options.feedback ?? 'success'
  if (feedback === 'success') notifySuccess()
  else if (feedback === 'warning') notifyWarning()
  await options.onSuccess?.()
  return true
}
