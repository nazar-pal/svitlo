import { powersync } from '@/lib/powersync/database'
import { clearCredentialCache } from '@/lib/powersync/connector'

import { authClient } from './auth-client'
import { clearLocalIdentity } from './offline-identity'

// Low-level sign-out: clears the Better Auth session and SecureStore identity.
// Does NOT update React context state — use useSignOut() from components instead.
export async function signOut() {
  try {
    await authClient.signOut()
  } finally {
    await clearLocalIdentity()
  }
}

// Full teardown: wipes PowerSync local data, clears cached credentials, and
// signs out from BetterAuth. Call this when the user explicitly signs out or
// when emergency sign-out is needed.
export async function disconnectAndSignOut() {
  await powersync.disconnectAndClear()
  clearCredentialCache()
  await signOut()
}
