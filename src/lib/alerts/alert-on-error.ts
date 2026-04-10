import { Alert } from 'react-native'

import type { MutationResult } from '@/data/shared/result'
import { t } from '@/lib/i18n'

export function alertOnError(
  result: MutationResult
): result is { ok: false; error: string } {
  if (!result.ok) Alert.alert(t('common.error'), result.error)
  return !result.ok
}
