import React, { createContext, useContext, useEffect, useReducer } from 'react'

import { ReadinessErrorScreen } from './error-screen'

export type ReadinessPhase =
  | 'cold-start'
  | 'unauthenticated'
  | 'initializing-db'
  | 'db-failed'
  | 'first-sync'
  | 'rendering-home'
  | 'ready'

interface ReadinessError {
  kind: 'db-init-failed'
  message: string
}

export interface ReadinessState {
  phase: ReadinessPhase
  splashHidden: boolean
  protectedReady: boolean
  error: ReadinessError | null
}

export type ReadinessEvent =
  | { type: 'identity-resolved'; hasIdentity: boolean }
  | { type: 'db-init-succeeded' }
  | { type: 'db-init-failed'; message: string }
  | { type: 'first-sync-completed' }
  | { type: 'home-settled' }
  | { type: 'retry-db-init' }

export const INITIALIZING_DB_HARD_DEADLINE_MS = 15_000
export const RENDERING_HOME_HARD_DEADLINE_MS = 2_000

const initialState: ReadinessState = {
  phase: 'cold-start',
  splashHidden: false,
  protectedReady: false,
  error: null
}

function projectPhase(phase: ReadinessPhase): ReadinessState {
  switch (phase) {
    case 'cold-start':
    case 'initializing-db':
      return { phase, splashHidden: false, protectedReady: false, error: null }
    // Splash hides as soon as PowerSync is initialized so the user sees
    // InitialSyncScreen progress on first launch and the home transition on
    // subsequent launches.
    case 'first-sync':
    case 'rendering-home':
    case 'unauthenticated':
    case 'db-failed':
      return { phase, splashHidden: true, protectedReady: false, error: null }
    case 'ready':
      return { phase, splashHidden: true, protectedReady: true, error: null }
    default:
      throw new Error(`unhandled readiness phase: ${phase satisfies never}`)
  }
}

function noop(state: ReadinessState, event: ReadinessEvent): ReadinessState {
  if (__DEV__)
    console.warn(
      `[app-readiness] ignoring ${event.type} in phase ${state.phase}`
    )
  return state
}

function reduce(state: ReadinessState, event: ReadinessEvent): ReadinessState {
  switch (event.type) {
    case 'identity-resolved':
      // Losing identity is terminal from any phase — sign-out, emergency
      // sign-out, and server-side revocation all collapse to unauthenticated.
      if (!event.hasIdentity) return projectPhase('unauthenticated')
      if (state.phase === 'cold-start' || state.phase === 'unauthenticated')
        return projectPhase('initializing-db')
      return noop(state, event)

    case 'db-init-succeeded':
      if (state.phase === 'initializing-db') return projectPhase('first-sync')
      return noop(state, event)

    case 'db-init-failed':
      if (
        state.phase === 'initializing-db' ||
        state.phase === 'first-sync' ||
        state.phase === 'rendering-home'
      )
        return {
          phase: 'db-failed',
          splashHidden: true,
          protectedReady: false,
          error: { kind: 'db-init-failed', message: event.message }
        }
      return noop(state, event)

    case 'first-sync-completed':
      if (state.phase === 'first-sync') return projectPhase('rendering-home')
      return noop(state, event)

    case 'home-settled':
      if (state.phase === 'rendering-home') return projectPhase('ready')
      return noop(state, event)

    case 'retry-db-init':
      if (state.phase === 'db-failed') return projectPhase('initializing-db')
      return noop(state, event)

    default:
      throw new Error(
        `unhandled readiness event: ${(event satisfies never as ReadinessEvent).type}`
      )
  }
}

const ReadinessStateContext = createContext<ReadinessState | null>(null)
const ReadinessDispatchContext = createContext<
  ((event: ReadinessEvent) => void) | null
>(null)

export function AppReadinessProvider({
  children
}: {
  children: React.ReactNode
}) {
  const [state, dispatch] = useReducer(reduce, initialState)

  useEffect(() => {
    if (state.phase === 'initializing-db') {
      const timer = setTimeout(
        () =>
          dispatch({
            type: 'db-init-failed',
            message: 'Database initialization timed out'
          }),
        INITIALIZING_DB_HARD_DEADLINE_MS
      )
      return () => clearTimeout(timer)
    }
    if (state.phase === 'rendering-home') {
      const timer = setTimeout(
        () => dispatch({ type: 'home-settled' }),
        RENDERING_HOME_HARD_DEADLINE_MS
      )
      return () => clearTimeout(timer)
    }
  }, [state.phase])

  return (
    <ReadinessStateContext.Provider value={state}>
      <ReadinessDispatchContext.Provider value={dispatch}>
        {children}
      </ReadinessDispatchContext.Provider>
    </ReadinessStateContext.Provider>
  )
}

export function useReadinessState(): ReadinessState {
  const ctx = useContext(ReadinessStateContext)
  if (!ctx)
    throw new Error(
      'useReadinessState must be used inside AppReadinessProvider'
    )
  return ctx
}

export function useReadinessDispatch(): (event: ReadinessEvent) => void {
  const ctx = useContext(ReadinessDispatchContext)
  if (!ctx)
    throw new Error(
      'useReadinessDispatch must be used inside AppReadinessProvider'
    )
  return ctx
}

// Replacing the subtree on db-failed is load-bearing for retry semantics: it
// unmounts PowerSyncProvider so that dispatching retry-db-init (which returns
// to initializing-db and re-mounts children) runs PowerSyncProvider's mount
// effect again, re-executing powersync.init(). A non-unmounting branch would
// leave the previous init's failed state in place.
export function ReadinessGate({ children }: { children: React.ReactNode }) {
  const state = useReadinessState()
  const dispatch = useReadinessDispatch()
  if (state.phase === 'db-failed')
    return (
      <ReadinessErrorScreen
        message={state.error?.message}
        onRetry={() => dispatch({ type: 'retry-db-init' })}
      />
    )
  return <>{children}</>
}
