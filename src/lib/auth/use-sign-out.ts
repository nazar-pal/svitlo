import { useCallback } from 'react'
import { Alert } from 'react-native'

import { powersync } from '@/lib/powersync/database'

import { clearCredentialCache } from '../powersync/connector'
import { useLocalIdentity } from './local-identity-context'
import { signOut } from './sign-out'

function confirmDestructiveSignOut(pendingCount: number): Promise<boolean> {
  return new Promise(resolve => {
    Alert.alert(
      'Unsynced changes',
      `You have ${pendingCount} change${pendingCount === 1 ? '' : 's'} that ha${pendingCount === 1 ? 's' : 've'}n't been synced yet. Signing out will permanently delete ${pendingCount === 1 ? 'it' : 'them'}. Sign in again first to sync your data.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Sign out anyway',
          style: 'destructive',
          onPress: () => resolve(true)
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
