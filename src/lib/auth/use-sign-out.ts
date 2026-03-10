import { useCallback } from 'react'

import { powersync } from '@/lib/powersync/database'

import { clearCredentialCache } from '../powersync/connector'
import { useLocalIdentity } from './local-identity-context'
import { signOut } from './sign-out'

export function useSignOut() {
  const { applyIdentity } = useLocalIdentity()

  return useCallback(async () => {
    // 1. Clear identity first so the protected layout hides instantly
    applyIdentity(null)

    // 2. Disconnect PowerSync and wipe local SQLite data
    await powersync.disconnectAndClear()
    clearCredentialCache()

    // 3. Sign out from BetterAuth + clear SecureStore identity
    await signOut()
  }, [applyIdentity])
}
