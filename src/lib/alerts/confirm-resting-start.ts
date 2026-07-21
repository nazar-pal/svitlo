import { t } from '@/lib/i18n'

import { confirmDestructive } from './confirm-destructive'

export function confirmRestingStart(onStart: () => void) {
  confirmDestructive(
    t('generator.generatorIsResting'),
    t('generator.restingStartWarning'),
    { confirmLabel: t('generator.startAnyway'), onConfirm: onStart }
  )
}
