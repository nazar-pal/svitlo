import type { Action, AuthPhase, InternalState } from './types'

export const initialInternalState: InternalState = {
  identity: null,
  identityBootstrapped: false,
  session: null,
  sessionPending: true,
  hasRevalidatedOnce: false,
  status: 'unknown'
}

export function reduce(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case 'IDENTITY_LOADED':
      // If a later revalidation (or sign-out) already settled identity, the
      // mount-time SecureStore read must not clobber it.
      if (state.identityBootstrapped) return state
      return {
        ...state,
        identity: action.identity,
        identityBootstrapped: true
      }
    case 'SESSION_SNAPSHOT':
      return {
        ...state,
        session: action.session,
        sessionPending: action.isPending
      }
    case 'REVALIDATED_VALID':
      return {
        ...state,
        identity: action.identity,
        identityBootstrapped: true,
        status: 'valid',
        hasRevalidatedOnce: true
      }
    case 'REVALIDATED_EXPIRED':
      return {
        ...state,
        status: 'expired',
        hasRevalidatedOnce: true
      }
    case 'REVALIDATED_NOOP':
      return { ...state, hasRevalidatedOnce: true }
    case 'MARK_EXPIRED':
      return { ...state, status: 'expired' }
    case 'CLEARED':
      return {
        ...state,
        identity: null,
        identityBootstrapped: true,
        status: 'unknown'
      }
    default:
      throw new Error(
        `unhandled action: ${(action satisfies never as Action).type}`
      )
  }
}

// 'loading' covers both the initial SecureStore read and the window where
// we have no stored identity but Better Auth is still resolving its cached
// session.
export function derivePhase(state: InternalState): AuthPhase {
  if (!state.identityBootstrapped) return 'loading'
  if (!state.identity && state.sessionPending && !state.hasRevalidatedOnce)
    return 'loading'
  if (state.identity === null) return 'anonymous'
  if (state.session && !state.session.user?.name?.trim())
    return 'incomplete-profile'
  return 'authenticated'
}
