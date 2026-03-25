import { Alert } from 'react-native'

import { notifyWarning } from '@/lib/haptics'
import { t } from '@/lib/i18n'

export function confirmRestingStart(onStart: () => void) {
  Alert.alert(
    t('generator.generatorIsResting'),
    t('generator.restingStartWarning'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('generator.startAnyway'),
        style: 'destructive',
        onPress: () => {
          notifyWarning()
          onStart()
        }
      }
    ]
  )
}
