import type { LocalIdentity } from '../offline-identity'
import type { BetterAuthSession } from '../session-runtime'

// Cold-start through authenticated — the single source of truth for what the
// app should render. Computed from identity + session in reducer.derivePhase.
export type AuthPhase =
  | 'loading'
  | 'anonymous'
  | 'incomplete-profile'
  | 'authenticated'

export type AuthStatus = 'valid' | 'expired' | 'unknown'

export interface AuthSession {
  phase: AuthPhase
  identity: LocalIdentity | null
  session: BetterAuthSession
  status: AuthStatus
  markExpired: () => void
  signOut: () => Promise<void>
  emergencySignOut: () => Promise<void>
}

export interface InternalState {
  identity: LocalIdentity | null
  identityBootstrapped: boolean
  session: BetterAuthSession
  sessionPending: boolean
  hasRevalidatedOnce: boolean
  status: AuthStatus
}

export type Action =
  | { type: 'IDENTITY_LOADED'; identity: LocalIdentity | null }
  | { type: 'SESSION_SNAPSHOT'; session: BetterAuthSession; isPending: boolean }
  | { type: 'REVALIDATED_VALID'; identity: LocalIdentity }
  | { type: 'REVALIDATED_EXPIRED' }
  | { type: 'REVALIDATED_NOOP' }
  | { type: 'MARK_EXPIRED' }
  | { type: 'CLEARED' }
