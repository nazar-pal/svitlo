import { useStatus } from '@powersync/react-native'
import React, { createContext, useContext, useEffect, useReducer } from 'react'
import { StyleSheet, View } from 'react-native'

import { useAuthSession } from '@/lib/auth/session'

import { StartupErrorScreen } from './error-screen'
import { InitialSyncScreen } from './initial-sync-screen'
import { initialState, reduce, type StartupState } from './reducer'
import type { PowerSyncRuntime } from './runtime'

export type { StartupPhase, StartupState } from './reducer'

const INITIALIZING_DB_HARD_DEADLINE_MS = 15_000

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
  const { phase, status: sessionStatus } = useAuthSession()
  const status = useStatus()

  const isLoadingAuth = phase === 'loading'
  const readyForProtectedTree = phase === 'authenticated'
  const hasSynced = status.hasSynced ?? false
  const downloadProgress = status.downloadProgress ?? null

  // Observe auth phase to advance past cold-start and react to sign-out.
  useEffect(() => {
    if (isLoadingAuth) return
    if (!readyForProtectedTree) {
      dispatch({ type: 'IDENTITY_LOST' })
      return
    }
    dispatch({ type: 'INIT_REQUESTED' })
  }, [isLoadingAuth, readyForProtectedTree])

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
