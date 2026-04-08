import { useCallback } from 'react'
import { Alert } from 'react-native'

import { notifyWarning } from '@/lib/haptics'
import { t } from '@/lib/i18n'
import { powersync } from '@/lib/powersync/database'

import { useLocalIdentity } from './local-identity-context'
import { disconnectAndSignOut } from './sign-out'

function confirmDestructiveSignOut(pendingCount: number): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      t('signOut.unsyncedChanges'),
      t('signOut.unsyncedDesc', { count: pendingCount }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => resolve(false)
        },
        {
          text: t('signOut.signOutAnyway'),
          style: 'destructive',
          onPress: () => {
            notifyWarning()
            resolve(true)
          }
        }
      ]
    )
  })
}

export function useSignOut() {
  const { applyIdentity } = useLocalIdentity()

  return useCallback(async () => {
    const [{ count }] = await powersync.getAll<{ count: number }>(
      'SELECT COUNT(*) as count FROM ps_crud'
    )

    if (count > 0) {
      const confirmed = await confirmDestructiveSignOut(count)
      if (!confirmed) return
    } else {
      notifyWarning()
    }

    await disconnectAndSignOut()
    applyIdentity(null)
  }, [applyIdentity])
}
