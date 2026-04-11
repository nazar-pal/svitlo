import { useStatus } from '@powersync/react-native'
import React, { createContext, useContext, useEffect, useReducer } from 'react'
import { StyleSheet, View } from 'react-native'

import { useLocalIdentity } from '@/lib/auth/local-identity-context'
import {
  isProfileComplete,
  useSessionRuntime
} from '@/lib/auth/session-runtime'
import { useSessionStatus } from '@/lib/auth/session-status-context'

import { StartupErrorScreen } from './error-screen'
import { InitialSyncScreen } from './initial-sync-screen'
import type { PowerSyncRuntime } from './runtime'

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

const INITIALIZING_DB_HARD_DEADLINE_MS = 15_000

const initialState: StartupState = {
  phase: 'cold-start',
  splashHidden: false,
  error: null
}

function projectPhase(phase: StartupPhase): StartupState {
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

function reduce(state: StartupState, action: Action): StartupState {
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
          phase: 'db-failed',
          splashHidden: true,
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
        `unhandled action: ${(action satisfies never as Action).type}`
      )
  }
}

const StartupStateContext = createContext<StartupState | null>(null)

interface StartupCoordinatorProps {
  runtime: PowerSyncRuntime
  children: React.ReactNode
}

export function StartupCoordinator({
  runtime,
  children
}: StartupCoordinatorProps) {
  const [state, dispatch] = useReducer(reduce, initialState)
  const { identity, isLoading: isIdentityLoading } = useLocalIdentity()
  const { sessionStatus } = useSessionStatus()
  const sessionRuntime = useSessionRuntime()
  const { data: session } = sessionRuntime.useSession()
  const status = useStatus()

  const readyForProtectedTree = identity !== null && isProfileComplete(session)
  const hasSynced = status.hasSynced ?? false
  const downloadProgress = status.downloadProgress ?? null

  // Observe identity to advance past cold-start and react to sign-out.
  useEffect(() => {
    if (isIdentityLoading) return
    if (!readyForProtectedTree) {
      dispatch({ type: 'IDENTITY_LOST' })
      return
    }
    dispatch({ type: 'INIT_REQUESTED' })
  }, [isIdentityLoading, readyForProtectedTree])

  // Run powersync.init() when entering initializing-db. Retry from
  // db-failed reduces back to initializing-db which re-runs this effect.
  useEffect(() => {
    if (state.phase !== 'initializing-db') return

    let cancelled = false

    runtime
      .init()
      .then(() => {
        if (cancelled) return
        dispatch({ type: 'INIT_SUCCEEDED' })
      })
      .catch(error => {
        if (cancelled) return
        console.error(error)
        dispatch({
          type: 'INIT_FAILED',
          message: error instanceof Error ? error.message : String(error)
        })
      })

    const timer = setTimeout(
      () =>
        dispatch({
          type: 'INIT_FAILED',
          message: 'Database initialization timed out'
        }),
      INITIALIZING_DB_HARD_DEADLINE_MS
    )

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [state.phase, runtime])

  // Drive connect/disconnect from session status. Same semantics as the
  // old PowerSyncProvider effect: connect when session is valid and the DB
  // is open; cleanup disconnects on any transition away from valid.
  useEffect(() => {
    if (state.phase !== 'first-sync' && state.phase !== 'ready') return
    if (sessionStatus !== 'valid') return
    runtime.connect()
    return () => {
      runtime.disconnect()
    }
  }, [state.phase, sessionStatus, runtime])

  // Advance out of first-sync once PowerSync reports its initial sync is
  // complete. `hasSynced` only matters in first-sync — the reducer ignores
  // SYNC_COMPLETED from any other phase, but gating here avoids noise.
  useEffect(() => {
    if (state.phase !== 'first-sync') return
    if (!hasSynced) return
    dispatch({ type: 'SYNC_COMPLETED' })
  }, [state.phase, hasSynced])

  const retry = () => dispatch({ type: 'RETRY' })

  return (
    <StartupStateContext.Provider value={state}>
      {children}
      {state.phase === 'first-sync' ? (
        <View style={StyleSheet.absoluteFillObject}>
          <InitialSyncScreen progress={downloadProgress} />
        </View>
      ) : null}
      {state.phase === 'db-failed' ? (
        <View style={StyleSheet.absoluteFillObject}>
          <StartupErrorScreen message={state.error?.message} onRetry={retry} />
        </View>
      ) : null}
    </StartupStateContext.Provider>
  )
}

export function useStartupState(): StartupState {
  const ctx = useContext(StartupStateContext)
  if (!ctx)
    throw new Error('useStartupState must be used inside StartupCoordinator')
  return ctx
}
