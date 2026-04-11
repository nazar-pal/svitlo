import { act, renderHook, waitFor } from '@testing-library/react-native'
import React, { useSyncExternalStore } from 'react'

jest.mock('@/lib/powersync/database', () => ({
  powersync: {
    getAll: jest.fn(async () => [{ count: 0 }]),
    disconnectAndClear: jest.fn(async () => {})
  }
}))

jest.mock('../../sign-out', () => ({
  disconnectAndSignOut: jest.fn(async () => {})
}))

import type { LocalIdentity } from '../../offline-identity'
import type {
  BetterAuthSession,
  SessionFetchResult,
  SessionRuntime,
  SessionSnapshot
} from '../../session-runtime'
import { SessionRuntimeProvider } from '../../session-runtime'
import { disconnectAndSignOut } from '../../sign-out'
import { AuthSessionProvider, useAuthSession } from '../provider'
import type { IdentityStorage } from '../storage'

const disconnectAndSignOutMock = disconnectAndSignOut as jest.Mock

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

interface FakeStorageHandle {
  storage: IdentityStorage
  setSeed: (identity: LocalIdentity | null) => void
  writeMock: jest.Mock<Promise<LocalIdentity>, [string]>
  readMock: jest.Mock<Promise<LocalIdentity | null>, []>
  clearMock: jest.Mock<Promise<void>, []>
}

function createFakeStorage(
  initial: LocalIdentity | null = null
): FakeStorageHandle {
  let seed: LocalIdentity | null = initial
  const readMock = jest.fn<Promise<LocalIdentity | null>, []>(async () => seed)
  const writeMock = jest.fn<Promise<LocalIdentity>, [string]>(
    async (userId: string) => {
      seed = { version: 1, userId }
      return seed
    }
  )
  const clearMock = jest.fn<Promise<void>, []>(async () => {
    seed = null
  })
  return {
    storage: {
      read: () => readMock(),
      write: (userId: string) => writeMock(userId),
      clear: () => clearMock()
    },
    setSeed: value => {
      seed = value
    },
    readMock,
    writeMock,
    clearMock
  }
}

type HarnessSession = SessionSnapshot['data']

const validSession = (id: string, name: string = 'Alice'): HarnessSession =>
  ({ user: { id, name } }) as unknown as BetterAuthSession

function makeWrapper(
  runtime: SessionRuntime,
  storage: IdentityStorage
): React.FC<{ children: React.ReactNode }> {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <SessionRuntimeProvider runtime={runtime}>
        <AuthSessionProvider storage={storage}>{children}</AuthSessionProvider>
      </SessionRuntimeProvider>
    )
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('AuthSessionProvider', () => {
  it('cold start with stored identity + valid cached session → authenticated', async () => {
    const fake = createFakeRuntime({
      data: validSession('user-1'),
      isPending: false
    })
    const storage = createFakeStorage({ version: 1, userId: 'user-1' })
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() => expect(result.current.phase).toBe('authenticated'))
    expect(result.current.status).toBe('valid')
    expect(result.current.identity).toEqual({ version: 1, userId: 'user-1' })
    expect(fake.getSession).not.toHaveBeenCalled()
  })

  it('cold start offline with no stored identity → anonymous and no network call', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.isOnline.mockResolvedValue(false)
    const storage = createFakeStorage(null)
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() => expect(result.current.phase).toBe('anonymous'))
    expect(fake.getSession).not.toHaveBeenCalled()
    expect(result.current.status).toBe('unknown')
    expect(result.current.identity).toBeNull()
  })

  it('cold start online, server confirms no session → anonymous + status=expired', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.getSession.mockResolvedValue({ data: null, error: null })
    const storage = createFakeStorage(null)
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() => expect(result.current.phase).toBe('anonymous'))
    expect(fake.getSession).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('expired')
    expect(result.current.identity).toBeNull()
  })

  it('cold start online, server returns fresh user → authenticated + identity persisted', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.getSession.mockResolvedValue({
      data: validSession('user-42'),
      error: null
    })
    const storage = createFakeStorage(null)
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() =>
      expect(result.current.identity).toEqual({
        version: 1,
        userId: 'user-42'
      })
    )
    expect(result.current.phase).toBe('authenticated')
    expect(result.current.status).toBe('valid')
    expect(storage.writeMock).toHaveBeenCalledWith('user-42')
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
      const storage = createFakeStorage(null)
      const { result } = renderHook(() => useAuthSession(), {
        wrapper: makeWrapper(fake.runtime, storage.storage)
      })

      await waitFor(() => expect(fake.getSession).toHaveBeenCalledTimes(1))

      await act(async () => {
        jest.advanceTimersByTime(5_000)
      })

      await waitFor(() => expect(fake.getSession).toHaveBeenCalledTimes(2))
      await waitFor(() =>
        expect(result.current.identity).toEqual({
          version: 1,
          userId: 'user-retry'
        })
      )
    } finally {
      jest.useRealTimers()
    }
  })

  it('incomplete profile when stored identity + session has blank user.name', async () => {
    const fake = createFakeRuntime({
      data: validSession('user-1', ''),
      isPending: false
    })
    const storage = createFakeStorage({ version: 1, userId: 'user-1' })
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() => expect(result.current.phase).toBe('incomplete-profile'))
  })

  it('re-runs when the session snapshot changes after bootstrapping', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.getSession.mockResolvedValue({ data: null, error: null })
    const storage = createFakeStorage(null)
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() => expect(result.current.status).toBe('expired'))
    expect(fake.getSession).toHaveBeenCalledTimes(1)

    await act(async () => {
      fake.setSession({ data: validSession('later-user'), isPending: false })
    })

    await waitFor(() =>
      expect(result.current.identity).toEqual({
        version: 1,
        userId: 'later-user'
      })
    )
    expect(result.current.status).toBe('valid')
    expect(result.current.phase).toBe('authenticated')
  })

  it('refetches when connectivity returns', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.isOnline.mockResolvedValue(false)
    const storage = createFakeStorage(null)
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() => expect(result.current.phase).toBe('anonymous'))
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
  })

  it('refetches when the app returns to the foreground', async () => {
    const fake = createFakeRuntime({ data: null, isPending: false })
    fake.getSession.mockResolvedValue({ data: null, error: null })
    const storage = createFakeStorage(null)
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() => expect(result.current.status).toBe('expired'))

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
    let resolveWrite!: (value: LocalIdentity) => void
    const storage = createFakeStorage(null)
    storage.writeMock.mockImplementation(
      () =>
        new Promise(r => {
          resolveWrite = r
        })
    )

    const fake = createFakeRuntime({
      data: validSession('user-1'),
      isPending: false
    })
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await act(async () => {
      fake.setSession({ data: validSession('user-1'), isPending: false })
    })
    await act(async () => {
      fake.setSession({ data: validSession('user-1'), isPending: false })
    })

    expect(storage.writeMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveWrite({ version: 1, userId: 'user-1' })
    })

    await waitFor(() => expect(result.current.phase).toBe('authenticated'))
    expect(storage.writeMock).toHaveBeenCalledTimes(1)
    expect(result.current.identity).toEqual({ version: 1, userId: 'user-1' })
  })

  it('markExpired() sets status to expired but preserves identity', async () => {
    const fake = createFakeRuntime({
      data: validSession('user-1'),
      isPending: false
    })
    const storage = createFakeStorage({ version: 1, userId: 'user-1' })
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() => expect(result.current.phase).toBe('authenticated'))

    await act(async () => {
      result.current.markExpired()
    })

    expect(result.current.status).toBe('expired')
    expect(result.current.identity).toEqual({ version: 1, userId: 'user-1' })
    expect(result.current.phase).toBe('authenticated')
  })

  it('signOut() clears identity through the port and calls disconnectAndSignOut once', async () => {
    const fake = createFakeRuntime({
      data: validSession('user-1'),
      isPending: false
    })
    const storage = createFakeStorage({ version: 1, userId: 'user-1' })
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() => expect(result.current.phase).toBe('authenticated'))

    await act(async () => {
      await result.current.signOut()
    })

    expect(disconnectAndSignOutMock).toHaveBeenCalledTimes(1)
    expect(storage.clearMock).toHaveBeenCalledTimes(1)
    expect(result.current.phase).toBe('anonymous')
    expect(result.current.identity).toBeNull()
  })

  it('emergencySignOut() dispatches CLEARED even when disconnectAndSignOut throws', async () => {
    disconnectAndSignOutMock.mockRejectedValueOnce(new Error('powersync down'))

    const fake = createFakeRuntime({
      data: validSession('user-1'),
      isPending: false
    })
    const storage = createFakeStorage({ version: 1, userId: 'user-1' })
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() => expect(result.current.phase).toBe('authenticated'))

    await act(async () => {
      await expect(result.current.emergencySignOut()).rejects.toThrow(
        'powersync down'
      )
    })

    // storage.clear was skipped because disconnectAndSignOut threw, but the
    // reducer was still cleared so the UI unsticks.
    expect(storage.clearMock).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('anonymous')
    expect(result.current.identity).toBeNull()
  })

  it('emergencySignOut() clears identity through the port on the happy path', async () => {
    const fake = createFakeRuntime({
      data: validSession('user-1'),
      isPending: false
    })
    const storage = createFakeStorage({ version: 1, userId: 'user-1' })
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    await waitFor(() => expect(result.current.phase).toBe('authenticated'))

    await act(async () => {
      await result.current.emergencySignOut()
    })

    expect(disconnectAndSignOutMock).toHaveBeenCalledTimes(1)
    expect(storage.clearMock).toHaveBeenCalledTimes(1)
    expect(result.current.phase).toBe('anonymous')
    expect(result.current.identity).toBeNull()
  })

  it('race regression: late storage.read resolution cannot clobber a revalidated identity', async () => {
    let releaseRead!: () => void
    const storage = createFakeStorage(null)
    storage.readMock.mockImplementation(
      () =>
        new Promise(resolve => {
          releaseRead = () => resolve({ version: 1, userId: 'stale-user' })
        })
    )

    const fake = createFakeRuntime({
      data: validSession('fresh-user'),
      isPending: false
    })
    const { result } = renderHook(() => useAuthSession(), {
      wrapper: makeWrapper(fake.runtime, storage.storage)
    })

    // Revalidation fires off the session snapshot path and persists fresh-user
    // BEFORE the mount-time storage.read() resolves.
    await waitFor(() =>
      expect(result.current.identity).toEqual({
        version: 1,
        userId: 'fresh-user'
      })
    )

    await act(async () => {
      releaseRead()
    })

    // The late IDENTITY_LOADED must not clobber the revalidated identity —
    // but even if it dispatches, derivePhase sees the session and stays
    // authenticated. Identity stays fresh because REVALIDATED_VALID runs
    // after IDENTITY_LOADED in reducer order.
    await waitFor(() => expect(result.current.phase).toBe('authenticated'))
    expect(result.current.identity).toEqual({
      version: 1,
      userId: 'fresh-user'
    })
  })
})
