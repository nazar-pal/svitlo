import { useCallback } from 'react'
import { Alert } from 'react-native'

import { notifyWarning } from '@/lib/haptics'
import { t } from '@/lib/i18n'
import { powersync } from '@/lib/powersync/database'

import { clearCredentialCache } from '../powersync/connector'
import { useLocalIdentity } from './local-identity-context'
import { signOut } from './sign-out'

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
    // Check for unsynced CRUD operations before destroying local data
    const [{ count }] = await powersync.getAll<{ count: number }>(
      'SELECT COUNT(*) as count FROM ps_crud'
    )

    if (count > 0) {
      const confirmed = await confirmDestructiveSignOut(count)
      if (!confirmed) return
    } else {
      notifyWarning()
    }

    // 1. Disconnect PowerSync and wipe local SQLite data while still mounted
    await powersync.disconnectAndClear()
    clearCredentialCache()

    // 2. Sign out from BetterAuth + clear SecureStore identity
    await signOut()

    // 3. Clear identity last so the protected layout unmounts cleanly
    applyIdentity(null)
  }, [applyIdentity])
}
