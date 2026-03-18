import { Alert } from 'react-native'

import { notifyWarning } from '@/lib/haptics'

export function confirmRestingStart(onStart: () => void) {
  Alert.alert(
    'Generator is Resting',
    "It's recommended to let the generator rest before starting again. Starting now may reduce its lifespan.",
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Start Anyway',
        style: 'destructive',
        onPress: () => {
          notifyWarning()
          onStart()
        }
      }
    ]
  )
}
