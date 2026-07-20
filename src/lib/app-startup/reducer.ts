export type StartupPhase =
  | 'cold-start'
  | 'unauthenticated'
  | 'initializing-db'
  | 'db-failed'
  | 'first-sync'
  | 'ready'

export interface StartupState {
  phase: StartupPhase
  splashHidden: boolean
  error: { message: string } | null
}

type Action =
  | { type: 'INIT_REQUESTED' }
  | { type: 'INIT_SUCCEEDED' }
  | { type: 'INIT_FAILED'; message: string }
  | { type: 'SYNC_COMPLETED' }
  | { type: 'IDENTITY_LOST' }
  | { type: 'RETRY' }

export const initialState: StartupState = {
  phase: 'cold-start',
  splashHidden: false,
  error: null
}

export function projectPhase(phase: StartupPhase): StartupState {
  switch (phase) {
    case 'cold-start':
    case 'initializing-db':
      return { phase, splashHidden: false, error: null }
    // Splash hides as soon as PowerSync is initialized so the user sees
    // InitialSyncScreen progress on first launch and the home transition on
    // subsequent launches.
    case 'first-sync':
    case 'unauthenticated':
    case 'db-failed':
    case 'ready':
      return { phase, splashHidden: true, error: null }
    default:
      throw new Error(`unhandled startup phase: ${phase satisfies never}`)
  }
}

export function reduce(state: StartupState, action: Action): StartupState {
  switch (action.type) {
    case 'INIT_REQUESTED':
      if (
        state.phase === 'cold-start' ||
        state.phase === 'unauthenticated' ||
        state.phase === 'db-failed'
      )
        return projectPhase('initializing-db')
      return state

    case 'INIT_SUCCEEDED':
      if (state.phase === 'initializing-db') return projectPhase('first-sync')
      return state

    case 'INIT_FAILED':
      if (state.phase === 'initializing-db')
        return {
          ...projectPhase('db-failed'),
          error: { message: action.message }
        }
      return state

    case 'SYNC_COMPLETED':
      if (state.phase === 'first-sync') return projectPhase('ready')
      return state

    case 'IDENTITY_LOST':
      // Losing identity is terminal from any phase — sign-out, emergency
      // sign-out, and server-side revocation all collapse to unauthenticated.
      if (state.phase === 'unauthenticated') return state
      return projectPhase('unauthenticated')

    case 'RETRY':
      if (state.phase === 'db-failed') return projectPhase('initializing-db')
      return state

    default:
      throw new Error(
        `unhandled action: ${JSON.stringify(action satisfies never)}`
      )
  }
}
