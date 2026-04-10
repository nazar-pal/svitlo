import { Alert } from 'react-native'

import type { MutationError } from '@/data/shared/errors'
import type { MutationResult } from '@/data/shared/result'
import { t } from '@/lib/i18n'
import { translateMutationError } from '@/lib/i18n/translate-mutation-error'

export function alertOnError(
  result: MutationResult
): result is { ok: false; error: MutationError } {
  if (!result.ok)
    Alert.alert(t('common.error'), translateMutationError(result.error))
  return !result.ok
}
