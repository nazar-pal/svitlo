import { powersync } from '@/lib/powersync/database'

import { authClient } from './auth-client'

// Tears down PowerSync *before* signing out of Better Auth: the connector
// caches credentials in per-instance closure state and must be disposed so
// it cannot keep calling the server with a revoked session.
export async function disconnectAndSignOut() {
  await powersync.disconnectAndClear()
  await authClient.signOut()
}
