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
