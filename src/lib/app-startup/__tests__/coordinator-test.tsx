import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React, { useSyncExternalStore } from 'react'
import { View } from 'react-native'

// Mutable mock state for useStatus — must be `mock`-prefixed so
// jest.mock's factory (which is hoisted above imports) can reference it.
const mockPowerSyncStatus: {
  snapshot: { hasSynced: boolean; downloadProgress: null }
  listeners: Set<() => void>
} = {
  snapshot: { hasSynced: false, downloadProgress: null },
  listeners: new Set()
}

jest.mock('@powersync/react-native', () => {
  const actualReact: typeof import('react') = jest.requireActual('react')
  return {
    useStatus: () =>
      actualReact.useSyncExternalStore(
        (cb: () => void) => {
          mockPowerSyncStatus.listeners.add(cb)
          return () => {
            mockPowerSyncStatus.listeners.delete(cb)
          }
        },
        () => mockPowerSyncStatus.snapshot
      )
  }
})

jest.mock('heroui-native', () => {
  const { Pressable, Text } = jest.requireActual('react-native')
  function Button({
    children,
    onPress
  }: {
    children: React.ReactNode
    onPress?: () => void
    variant?: string
    size?: string
  }) {
    return (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{children}</Text>
      </Pressable>
    )
  }
  return { Button }
})

jest.mock('@/lib/powersync/database', () => ({
  powersync: {
    getAll: jest.fn(async () => [{ count: 0 }]),
    disconnectAndClear: jest.fn(async () => {})
  }
}))

jest.mock('@/lib/auth/sign-out', () => ({
  disconnectAndSignOut: jest.fn(async () => {})
}))

import type { LocalIdentity } from '@/lib/auth/offline-identity'
import { AuthSessionProvider, useAuthSession } from '@/lib/auth/session'
import type { IdentityStorage } from '@/lib/auth/session'
import type {
  BetterAuthSession,
  SessionFetchResult,
  SessionRuntime,
  SessionSnapshot
} from '@/lib/auth/session-runtime'
import { SessionRuntimeProvider } from '@/lib/auth/session-runtime'

import {
  StartupCoordinator,
  useStartupState,
  type StartupPhase
} from '../coordinator'
import type { PowerSyncRuntime } from '../runtime'

interface FakeRuntimeHandle {
  runtime: PowerSyncRuntime
  initMock: jest.Mock
  connectMock: jest.Mock
  disconnectMock: jest.Mock
  resolveInit: () => void
  rejectInit: (error: Error) => void
  setHasSynced: (value: boolean) => void
}

function createFakePowerSyncRuntime(): FakeRuntimeHandle {
  const initResolvers: {
    resolve: () => void
    reject: (err: Error) => void
  }[] = []

  const initMock = jest.fn<Promise<void>, []>(
    () =>
      new Promise<void>((resolve, reject) => {
        initResolvers.push({ resolve: () => resolve(), reject })
      })
  )
  const connectMock = jest.fn<void, []>()
  const disconnectMock = jest.fn<void, []>()

  const runtime: PowerSyncRuntime = {
    init: initMock,
    connect: connectMock,
    disconnect: disconnectMock
  }

  return {
    runtime,
    initMock,
    connectMock,
    disconnectMock,
    resolveInit: () => {
      const next = initResolvers.shift()
      if (!next) throw new Error('resolveInit called with no pending init()')
      next.resolve()
    },
    rejectInit: (error: Error) => {
      const next = initResolvers.shift()
      if (!next) throw new Error('rejectInit called with no pending init()')
      next.reject(error)
    },
    setHasSynced: (value: boolean) => {
      mockPowerSyncStatus.snapshot = {
        ...mockPowerSyncStatus.snapshot,
        hasSynced: value
      }
      mockPowerSyncStatus.listeners.forEach(cb => cb())
    }
  }
}

interface FakeSessionRuntimeHandle {
  runtime: SessionRuntime
  setSession: (next: SessionSnapshot) => void
}

function createFakeSessionRuntime(
  initial: SessionSnapshot
): FakeSessionRuntimeHandle {
  let snapshot = initial
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  const runtime: SessionRuntime = {
    useSession: () => useSyncExternalStore(subscribe, () => snapshot),
    getSession: jest.fn<Promise<SessionFetchResult>, []>(() =>
      Promise.resolve({ data: null, error: null })
    ),
    isOnline: jest.fn<Promise<boolean>, []>(() => Promise.resolve(true)),
    onConnectivityChange: () => () => {},
    onForeground: () => () => {}
  }
  return {
    runtime,
    setSession: next => {
      snapshot = next
      listeners.forEach(fn => fn())
    }
  }
}

function createFakeStorage(initial: LocalIdentity | null): IdentityStorage {
  let seed = initial
  return {
    read: async () => seed,
    write: async userId => {
      seed = { version: 1, userId }
      return seed
    },
    clear: async () => {
      seed = null
    }
  }
}

const validSession = (
  id: string,
  name: string = 'Alice'
): SessionSnapshot['data'] =>
  ({ user: { id, name } }) as unknown as BetterAuthSession

interface ProbeValue {
  phase: StartupPhase
  splashHidden: boolean
  signOut: () => Promise<void>
  markExpired: () => void
  setSession: (next: SessionSnapshot) => void
}

const probeRef: { current: ProbeValue | null } = { current: null }

function Probe({
  setSession
}: {
  setSession: (next: SessionSnapshot) => void
}) {
  const state = useStartupState()
  const auth = useAuthSession()
  probeRef.current = {
    phase: state.phase,
    splashHidden: state.splashHidden,
    signOut: auth.signOut,
    markExpired: auth.markExpired,
    setSession
  }
  return null
}

interface RenderOptions {
  initialSession?: SessionSnapshot
  initialIdentity?: LocalIdentity | null
}

function renderCoordinator(
  handle: FakeRuntimeHandle,
  options: RenderOptions = {}
) {
  probeRef.current = null
  const sessionRuntime = createFakeSessionRuntime(
    options.initialSession ?? {
      data: validSession('user-1'),
      isPending: false
    }
  )
  const storage = createFakeStorage(
    options.initialIdentity === undefined
      ? { version: 1, userId: 'user-1' }
      : options.initialIdentity
  )
  const result = render(
    <SessionRuntimeProvider runtime={sessionRuntime.runtime}>
      <AuthSessionProvider storage={storage}>
        <StartupCoordinator runtime={handle.runtime}>
          <Probe setSession={sessionRuntime.setSession} />
          <View testID="children" />
        </StartupCoordinator>
      </AuthSessionProvider>
    </SessionRuntimeProvider>
  )
  return { ...result, sessionRuntime }
}

function probe(): ProbeValue {
  if (!probeRef.current) throw new Error('Probe has not mounted yet')
  return probeRef.current
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPowerSyncStatus.snapshot = { hasSynced: false, downloadProgress: null }
  mockPowerSyncStatus.listeners.clear()
  // Suppress expected console.error from the init rejection path —
  // the coordinator logs the thrown error before dispatching INIT_FAILED.
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

describe('StartupCoordinator', () => {
  it('advances through the happy path to ready and renders children', async () => {
    const fake = createFakePowerSyncRuntime()
    renderCoordinator(fake)

    // Wait until AuthSessionProvider finishes its async mount effect and
    // the coordinator advances into initializing-db.
    await waitFor(() => expect(probe().phase).toBe('initializing-db'))
    expect(fake.initMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      fake.resolveInit()
    })
    expect(probe().phase).toBe('first-sync')

    // Valid session triggers connect once we reach first-sync. Revalidation
    // already set sessionStatus to 'valid' from the fake session snapshot.
    expect(fake.connectMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      fake.setHasSynced(true)
    })
    await waitFor(() => expect(probe().phase).toBe('ready'))
  })

  it('transitions to db-failed when init rejects', async () => {
    const fake = createFakePowerSyncRuntime()
    const { getByText } = renderCoordinator(fake)

    await waitFor(() => expect(probe().phase).toBe('initializing-db'))

    await act(async () => {
      fake.rejectInit(new Error('disk full'))
    })

    await waitFor(() => expect(probe().phase).toBe('db-failed'))
    expect(getByText('disk full')).toBeTruthy()
    expect(getByText('Try Again')).toBeTruthy()
  })

  it('times out init after 15 seconds and transitions to db-failed', async () => {
    jest.useFakeTimers()
    try {
      const fake = createFakePowerSyncRuntime()
      renderCoordinator(fake)

      // AuthSessionProvider's async effect still needs to resolve —
      // flushing microtasks inside an act() unblocks it.
      await act(async () => {
        await Promise.resolve()
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(probe().phase).toBe('initializing-db')

      await act(async () => {
        jest.advanceTimersByTime(15_000)
      })
      expect(probe().phase).toBe('db-failed')
    } finally {
      jest.useRealTimers()
    }
  })

  it('cleans up the init deadline timer so a stale timeout cannot sink a later init', async () => {
    jest.useFakeTimers()
    try {
      const fake = createFakePowerSyncRuntime()
      renderCoordinator(fake)

      // T1 starts when the first initializing-db effect runs.
      await act(async () => {
        await Promise.resolve()
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(probe().phase).toBe('initializing-db')

      // Burn 10s off T1's 15s budget, then drop identity via sign-out. The
      // init-effect cleanup must clear T1 — otherwise it will still fire
      // 5s later.
      await act(async () => {
        jest.advanceTimersByTime(10_000)
      })
      await act(async () => {
        await probe().signOut()
      })
      expect(probe().phase).toBe('unauthenticated')

      // Re-auth: push a fresh session snapshot to trigger new identity and
      // a new initializing-db with a fresh T2.
      await act(async () => {
        probe().setSession({
          data: validSession('user-1'),
          isPending: false
        })
      })
      await waitFor(() => expect(probe().phase).toBe('initializing-db'))
      expect(fake.initMock).toHaveBeenCalledTimes(2)

      // Advance 5s — enough for a leaked T1 to fire (T1 started at t=0,
      // we're now at t=15), but T2 has 10s left. Phase must stay in
      // initializing-db; a db-failed here would mean T1 was not cleared.
      await act(async () => {
        jest.advanceTimersByTime(5_000)
      })
      expect(probe().phase).toBe('initializing-db')
    } finally {
      jest.useRealTimers()
    }
  })

  it('retries init from db-failed when Try Again is pressed', async () => {
    const fake = createFakePowerSyncRuntime()
    const { getByText } = renderCoordinator(fake)

    await waitFor(() => expect(probe().phase).toBe('initializing-db'))
    await act(async () => {
      fake.rejectInit(new Error('boom'))
    })
    await waitFor(() => expect(probe().phase).toBe('db-failed'))
    expect(fake.initMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      fireEvent.press(getByText('Try Again'))
    })
    expect(probe().phase).toBe('initializing-db')
    expect(fake.initMock).toHaveBeenCalledTimes(2)

    await act(async () => {
      fake.resolveInit()
    })
    expect(probe().phase).toBe('first-sync')
  })

  it('collapses to unauthenticated when identity is lost during initializing-db', async () => {
    const fake = createFakePowerSyncRuntime()
    renderCoordinator(fake)

    await waitFor(() => expect(probe().phase).toBe('initializing-db'))
    expect(fake.initMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      await probe().signOut()
    })
    expect(probe().phase).toBe('unauthenticated')

    // The in-flight init() resolving after collapse must not advance the
    // phase back into first-sync — IDENTITY_LOST is terminal until a new
    // identity arrives.
    await act(async () => {
      fake.resolveInit()
    })
    expect(probe().phase).toBe('unauthenticated')
  })

  it('collapses to unauthenticated when identity is lost', async () => {
    const fake = createFakePowerSyncRuntime()
    renderCoordinator(fake)

    await waitFor(() => expect(probe().phase).toBe('initializing-db'))
    await act(async () => {
      fake.resolveInit()
    })
    await act(async () => {
      fake.setHasSynced(true)
    })
    await waitFor(() => expect(probe().phase).toBe('ready'))

    await act(async () => {
      await probe().signOut()
    })
    expect(probe().phase).toBe('unauthenticated')
  })

  it('connects when session is valid and disconnects on expiry', async () => {
    const fake = createFakePowerSyncRuntime()
    renderCoordinator(fake)

    await waitFor(() => expect(probe().phase).toBe('initializing-db'))
    await act(async () => {
      fake.resolveInit()
    })

    expect(fake.connectMock).toHaveBeenCalledTimes(1)
    expect(fake.disconnectMock).not.toHaveBeenCalled()

    await act(async () => {
      probe().markExpired()
    })
    expect(fake.disconnectMock).toHaveBeenCalled()
  })

  it('does not re-init when session status blips during first-sync', async () => {
    const fake = createFakePowerSyncRuntime()
    renderCoordinator(fake)

    await waitFor(() => expect(probe().phase).toBe('initializing-db'))
    await act(async () => {
      fake.resolveInit()
    })
    expect(fake.initMock).toHaveBeenCalledTimes(1)
    expect(fake.connectMock).toHaveBeenCalledTimes(1)

    // Session expires (e.g., token blip), then returns.
    await act(async () => {
      probe().markExpired()
    })
    // Push a fresh valid session to restore status=valid.
    await act(async () => {
      probe().setSession({
        data: validSession('user-1'),
        isPending: false
      })
    })

    // Phase remains first-sync. init() was only ever called once.
    expect(probe().phase).toBe('first-sync')
    expect(fake.initMock).toHaveBeenCalledTimes(1)
    expect(fake.connectMock).toHaveBeenCalledTimes(2)
  })

  it('exposes splashHidden accurately across phases', async () => {
    const fake = createFakePowerSyncRuntime()
    renderCoordinator(fake)

    // initializing-db: splash still visible while DB opens.
    await waitFor(() => expect(probe().phase).toBe('initializing-db'))
    expect(probe().splashHidden).toBe(false)

    await act(async () => {
      fake.resolveInit()
    })
    expect(probe().phase).toBe('first-sync')
    expect(probe().splashHidden).toBe(true)

    await act(async () => {
      fake.setHasSynced(true)
    })
    await waitFor(() => expect(probe().phase).toBe('ready'))
    expect(probe().splashHidden).toBe(true)
  })
})
