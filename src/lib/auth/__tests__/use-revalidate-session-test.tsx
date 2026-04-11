import { act, renderHook, waitFor } from '@testing-library/react-native'
import React, { useSyncExternalStore } from 'react'

jest.mock('../offline-identity', () => ({
  getLocalIdentity: jest.fn(() => Promise.resolve(null)),
  persistLocalIdentity: jest.fn(async (userId: string) => ({
    version: 1,
    userId
  }))
}))

import {
  LocalIdentityProvider,
  useLocalIdentity
} from '../local-identity-context'
import { persistLocalIdentity } from '../offline-identity'
import type {
  SessionFetchResult,
  SessionRuntime,
  SessionSnapshot
} from '../session-runtime'
import { SessionRuntimeProvider } from '../session-runtime'
import {
  SessionStatusProvider,
  useSessionStatus
} from '../session-status-context'
import { useRevalidateSession } from '../use-revalidate-session'

const persistLocalIdentityMock = persistLocalIdentity as jest.Mock

interface FakeRuntimeHandle {
  runtime: SessionRuntime
  setSession: (next: SessionSnapshot) => void
  emitConnectivity: (online: boolean) => void
  emitForeground: () => void
  getSession: jest.Mock<Promise<SessionFetchResult>, []>
  isOnline: jest.Mock<Promise<boolean>, []>
}

function createFakeRuntime(initial: SessionSnapshot): FakeRuntimeHandle {
  let snapshot = initial
  const snapshotListeners = new Set<() => void>()
  const connectivityListeners = new Set<(online: boolean) => void>()
  const foregroundListeners = new Set<() => void>()

  const subscribe = (listener: () => void) => {
    snapshotListeners.add(listener)
    return () => {
      snapshotListeners.delete(listener)
    }
  }
  const getSnapshot = () => snapshot

  const getSession = jest.fn<Promise<SessionFetchResult>, []>(() =>
    Promise.resolve({ data: null, error: null })
  )
  const isOnline = jest.fn<Promise<boolean>, []>(() => Promise.resolve(true))

  const runtime: SessionRuntime = {
    useSession: () => useSyncExternalStore(subscribe, getSnapshot),
    getSession,
    isOnline,
    onConnectivityChange: listener => {
      connectivityListeners.add(listener)
      return () => {
        connectivityListeners.delete(listener)
      }
    },
    onForeground: listener => {
      foregroundListeners.add(listener)
      return () => {
        foregroundListeners.delete(listener)
      }
    }
  }

  return {
    runtime,
    getSession,
    isOnline,
    setSession: next => {
      snapshot = next
      snapshotListeners.forEach(fn => fn())
    },
    emitConnectivity: online => {
      connectivityListeners.forEach(fn => fn(online))
    },
    emitForeground: () => {
      foregroundListeners.forEach(fn => fn())
    }
  }
}

function makeWrapper(runtime: SessionRuntime) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SessionRuntimeProvider runtime={runtime}>
        <LocalIdentityProvider>
          <SessionStatusProvider>{children}</SessionStatusProvider>
        </LocalIdentityProvider>
      </SessionRuntimeProvider>
    )
  }
}

function useHarness() {
  const { identity, isLoading } = useLocalIdentity()
  const { sessionStatus } = useSessionStatus()
  const { isBootstrapping, session } = useRevalidateSession()
  return { isBootstrapping, identity, sessionStatus, isLoading, session }
}

type HarnessSession = SessionSnapshot['data']

const validSession = (id: string): HarnessSession =>
  ({ user: { id } }) as HarnessSession

beforeEach(() => {
  jest.clearAllMocks()
  persistLocalIdentityMock.mockImplementation(async (userId: string) => ({
    version: 1,
    userId
  }))
})

describe('useRevalidateSession', () => {
  it('persists identity when a valid cached session is provided', async () => {
    const fake = createFakeRuntime({
      data: validSession('user-1'),
      isPending: false
    })
    const { result } = renderHook(() => useHarness(), {
      wrapper: makeWrapper(fake.runtime)
    })

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false))

    expect(persistLocalIdentityMock).toHaveBeenCalledWith('user-1')
    expect(result.current.identity).toEqual({ version: 1, userId: 'user-1' })
    expect(result.current.sessionStatus).toBe('valid')
    expect(fake.getSession).not.toHaveBeenCalled()
  })

  it('skips network calls and still bootstraps when offline with no cached session', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.isOnline.mockResolvedValue(false)

    const { result } = renderHook(() => useHarness(), {
      wrapper: makeWrapper(fake.runtime)
    })

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false))

    expect(fake.getSession).not.toHaveBeenCalled()
    expect(result.current.identity).toBeNull()
    expect(result.current.sessionStatus).toBe('unknown')
  })

  it('online with no cached session: marks expired when server confirms none', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.getSession.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useHarness(), {
      wrapper: makeWrapper(fake.runtime)
    })

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false))

    expect(fake.getSession).toHaveBeenCalledTimes(1)
    expect(result.current.sessionStatus).toBe('expired')
    expect(result.current.identity).toBeNull()
  })

  it('online with no cached session: persists identity when server returns a valid user', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.getSession.mockResolvedValue({
      data: validSession('user-42'),
      error: null
    })

    const { result } = renderHook(() => useHarness(), {
      wrapper: makeWrapper(fake.runtime)
    })

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false))

    expect(persistLocalIdentityMock).toHaveBeenCalledWith('user-42')
    expect(result.current.sessionStatus).toBe('valid')
    expect(result.current.identity).toEqual({ version: 1, userId: 'user-42' })
  })

  it('schedules a retry when getSession returns an error', async () => {
    jest.useFakeTimers()
    try {
      const fake = createFakeRuntime({ data: null, isPending: false })
      fake.getSession
        .mockResolvedValueOnce({ data: null, error: { message: 'network' } })
        .mockResolvedValueOnce({
          data: validSession('user-retry'),
          error: null
        })

      const { result } = renderHook(() => useHarness(), {
        wrapper: makeWrapper(fake.runtime)
      })

      await waitFor(() => expect(result.current.isBootstrapping).toBe(false))
      expect(fake.getSession).toHaveBeenCalledTimes(1)

      await act(async () => {
        jest.advanceTimersByTime(5_000)
      })

      await waitFor(() => expect(fake.getSession).toHaveBeenCalledTimes(2))
      expect(result.current.identity).toEqual({
        version: 1,
        userId: 'user-retry'
      })
    } finally {
      jest.useRealTimers()
    }
  })

  it('re-runs when the session snapshot changes after bootstrapping', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.getSession.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useHarness(), {
      wrapper: makeWrapper(fake.runtime)
    })

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false))
    expect(result.current.sessionStatus).toBe('expired')
    expect(fake.getSession).toHaveBeenCalledTimes(1)

    // Better Auth resolves to a cached session after the initial revalidation.
    await act(async () => {
      fake.setSession({ data: validSession('later-user'), isPending: false })
    })

    await waitFor(() =>
      expect(result.current.identity).toEqual({
        version: 1,
        userId: 'later-user'
      })
    )
    expect(result.current.sessionStatus).toBe('valid')
  })

  it('refetches when connectivity returns', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.isOnline.mockResolvedValue(false)

    const { result } = renderHook(() => useHarness(), {
      wrapper: makeWrapper(fake.runtime)
    })

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false))
    expect(fake.getSession).not.toHaveBeenCalled()

    fake.isOnline.mockResolvedValue(true)
    fake.getSession.mockResolvedValue({
      data: validSession('reconnected-user'),
      error: null
    })

    await act(async () => {
      fake.emitConnectivity(true)
    })

    await waitFor(() =>
      expect(result.current.identity).toEqual({
        version: 1,
        userId: 'reconnected-user'
      })
    )
    expect(result.current.sessionStatus).toBe('valid')
  })

  it('refetches when the app returns to the foreground', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.getSession.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useHarness(), {
      wrapper: makeWrapper(fake.runtime)
    })

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false))
    expect(fake.getSession).toHaveBeenCalledTimes(1)

    fake.getSession.mockResolvedValue({
      data: validSession('resumed-user'),
      error: null
    })

    await act(async () => {
      fake.emitForeground()
    })

    await waitFor(() =>
      expect(result.current.identity).toEqual({
        version: 1,
        userId: 'resumed-user'
      })
    )
  })

  it('debounces overlapping revalidations while one is in flight', async () => {
    let resolvePersist!: (value: { version: 1; userId: string }) => void
    persistLocalIdentityMock.mockImplementation(
      () =>
        new Promise(r => {
          resolvePersist = r
        })
    )

    const fake = createFakeRuntime({
      data: validSession('user-1'),
      isPending: false
    })
    const { result } = renderHook(() => useHarness(), {
      wrapper: makeWrapper(fake.runtime)
    })

    // Each bump passes a new session object reference so the effect dep
    // array `[isPending, session]` sees a change and schedules another
    // revalidate call — which must no-op thanks to the in-flight guard.
    await act(async () => {
      fake.setSession({ data: validSession('user-1'), isPending: false })
    })
    await act(async () => {
      fake.setSession({ data: validSession('user-1'), isPending: false })
    })

    expect(persistLocalIdentityMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolvePersist({ version: 1, userId: 'user-1' })
    })

    await waitFor(() => expect(result.current.isBootstrapping).toBe(false))
    expect(persistLocalIdentityMock).toHaveBeenCalledTimes(1)
    expect(result.current.identity).toEqual({ version: 1, userId: 'user-1' })
  })
})
