import { useLocalIdentity } from './local-identity-context'
import { disconnectAndSignOut } from './sign-out'

// Emergency sign-out: runs the full teardown but also clears React state
// via applyIdentity(null). Shared by the startup error screen and the
// initial-sync "taking too long?" escape hatch.
export function useEmergencySignOut() {
  const { applyIdentity } = useLocalIdentity()
  return async function emergencySignOut() {
    try {
      await disconnectAndSignOut()
    } finally {
      applyIdentity(null)
    }
  }
}
