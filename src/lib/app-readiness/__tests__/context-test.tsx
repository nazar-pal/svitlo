import { act, render, renderHook } from '@testing-library/react-native'
import React from 'react'
import { View } from 'react-native'

jest.mock('heroui-native', () => {
  const { Pressable, Text } = jest.requireActual('react-native')
  function Button({
    children,
    onPress
  }: {
    children: React.ReactNode
    onPress?: () => void
    variant?: string
  }) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    )
  }
  return { Button }
})

jest.mock('@/lib/auth/local-identity-context', () => ({
  useLocalIdentity: jest.fn(() => ({
    identity: null,
    isLoading: false,
    applyIdentity: jest.fn()
  }))
}))

jest.mock('@/lib/auth/sign-out', () => ({
  disconnectAndSignOut: jest.fn(async () => {})
}))

import {
  AppReadinessProvider,
  INITIALIZING_DB_HARD_DEADLINE_MS,
  ReadinessGate,
  RENDERING_HOME_HARD_DEADLINE_MS,
  useReadinessDispatch,
  useReadinessState,
  type ReadinessEvent
} from '../context'

function useReadiness() {
  return {
    state: useReadinessState(),
    dispatch: useReadinessDispatch()
  }
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <AppReadinessProvider>{children}</AppReadinessProvider>
}

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.clearAllTimers()
  jest.useRealTimers()
})

describe('AppReadinessProvider', () => {
  it('starts in cold-start with splash visible and no error', () => {
    const { result } = renderHook(useReadiness, { wrapper })
    expect(result.current.state).toEqual({
      phase: 'cold-start',
      splashHidden: false,
      protectedReady: false,
      error: null
    })
  })

  it('advances through the happy path to ready', () => {
    const { result } = renderHook(useReadiness, { wrapper })

    act(() => {
      result.current.dispatch({ type: 'identity-resolved', hasIdentity: true })
    })
    expect(result.current.state.phase).toBe('initializing-db')
    expect(result.current.state.splashHidden).toBe(false)

    act(() => {
      result.current.dispatch({ type: 'db-init-succeeded' })
    })
    expect(result.current.state.phase).toBe('first-sync')
    expect(result.current.state.splashHidden).toBe(true)

    act(() => {
      result.current.dispatch({ type: 'first-sync-completed' })
    })
    expect(result.current.state.phase).toBe('rendering-home')

    act(() => {
      result.current.dispatch({ type: 'home-settled' })
    })
    expect(result.current.state).toEqual({
      phase: 'ready',
      splashHidden: true,
      protectedReady: true,
      error: null
    })
  })

  it('surfaces db-init-failed as error state with the original message', () => {
    const { result } = renderHook(useReadiness, { wrapper })

    act(() => {
      result.current.dispatch({ type: 'identity-resolved', hasIdentity: true })
      result.current.dispatch({
        type: 'db-init-failed',
        message: 'SQLite open failed'
      })
    })

    expect(result.current.state.phase).toBe('db-failed')
    expect(result.current.state.error).toEqual({
      kind: 'db-init-failed',
      message: 'SQLite open failed'
    })
    expect(result.current.state.splashHidden).toBe(true)
    expect(result.current.state.protectedReady).toBe(false)
  })

  it('retry-db-init returns to initializing-db with error cleared', () => {
    const { result } = renderHook(useReadiness, { wrapper })

    act(() => {
      result.current.dispatch({ type: 'identity-resolved', hasIdentity: true })
      result.current.dispatch({
        type: 'db-init-failed',
        message: 'SQLite open failed'
      })
    })
    expect(result.current.state.phase).toBe('db-failed')
    expect(result.current.state.error).not.toBeNull()

    act(() => {
      result.current.dispatch({ type: 'retry-db-init' })
    })
    expect(result.current.state.phase).toBe('initializing-db')
    expect(result.current.state.error).toBeNull()
  })

  it('collapses to unauthenticated from ready when identity is lost', () => {
    const { result } = renderHook(useReadiness, { wrapper })

    act(() => {
      result.current.dispatch({ type: 'identity-resolved', hasIdentity: true })
      result.current.dispatch({ type: 'db-init-succeeded' })
      result.current.dispatch({ type: 'first-sync-completed' })
      result.current.dispatch({ type: 'home-settled' })
    })
    expect(result.current.state.phase).toBe('ready')
    expect(result.current.state.protectedReady).toBe(true)

    act(() => {
      result.current.dispatch({ type: 'identity-resolved', hasIdentity: false })
    })
    expect(result.current.state.phase).toBe('unauthenticated')
    expect(result.current.state.protectedReady).toBe(false)
    expect(result.current.state.error).toBeNull()
  })

  it('fires the initializing-db hard deadline through the provider', () => {
    const { result } = renderHook(useReadiness, { wrapper })

    act(() => {
      result.current.dispatch({ type: 'identity-resolved', hasIdentity: true })
    })
    expect(result.current.state.phase).toBe('initializing-db')

    act(() => {
      jest.advanceTimersByTime(INITIALIZING_DB_HARD_DEADLINE_MS)
    })
    expect(result.current.state.phase).toBe('db-failed')
    expect(result.current.state.error?.message).toBe(
      'Database initialization timed out'
    )
  })

  it('fires the rendering-home hard deadline through the provider', () => {
    const { result } = renderHook(useReadiness, { wrapper })

    act(() => {
      result.current.dispatch({ type: 'identity-resolved', hasIdentity: true })
      result.current.dispatch({ type: 'db-init-succeeded' })
      result.current.dispatch({ type: 'first-sync-completed' })
    })
    expect(result.current.state.phase).toBe('rendering-home')

    act(() => {
      jest.advanceTimersByTime(RENDERING_HOME_HARD_DEADLINE_MS)
    })
    expect(result.current.state.phase).toBe('ready')
    expect(result.current.state.protectedReady).toBe(true)
  })

  it('clears a pending deadline when the phase advances before it fires', () => {
    const { result } = renderHook(useReadiness, { wrapper })

    act(() => {
      result.current.dispatch({ type: 'identity-resolved', hasIdentity: true })
    })
    expect(result.current.state.phase).toBe('initializing-db')

    act(() => {
      jest.advanceTimersByTime(INITIALIZING_DB_HARD_DEADLINE_MS - 1)
      result.current.dispatch({ type: 'db-init-succeeded' })
    })
    expect(result.current.state.phase).toBe('first-sync')

    // Advance well past the would-be deadline; if the timer hadn't been cleared,
    // it would dispatch db-init-failed and kick the FSM back to db-failed.
    act(() => {
      jest.advanceTimersByTime(INITIALIZING_DB_HARD_DEADLINE_MS)
    })
    expect(result.current.state.phase).toBe('first-sync')
    expect(result.current.state.error).toBeNull()
  })
})

describe('ReadinessGate', () => {
  function Harness({
    bridge
  }: {
    bridge: (dispatch: (event: ReadinessEvent) => void) => void
  }) {
    const dispatch = useReadinessDispatch()
    bridge(dispatch)
    return null
  }

  function renderGate() {
    let dispatcher!: (event: ReadinessEvent) => void
    const result = render(
      <AppReadinessProvider>
        <Harness
          bridge={dispatch => {
            dispatcher = dispatch
          }}
        />
        <ReadinessGate>
          <View testID="children" />
        </ReadinessGate>
      </AppReadinessProvider>
    )
    return { ...result, dispatch: dispatcher }
  }

  it('renders children while the phase is not db-failed', () => {
    const { queryByTestId, queryByText } = renderGate()
    expect(queryByTestId('children')).toBeTruthy()
    expect(queryByText('Something went wrong')).toBeNull()
  })

  it('renders the error screen when the phase is db-failed', () => {
    const { queryByTestId, getByText, dispatch } = renderGate()

    act(() => {
      dispatch({ type: 'identity-resolved', hasIdentity: true })
      dispatch({ type: 'db-init-failed', message: 'Disk full' })
    })

    expect(queryByTestId('children')).toBeNull()
    expect(getByText('Disk full')).toBeTruthy()
    expect(getByText('Try Again')).toBeTruthy()
  })
})
