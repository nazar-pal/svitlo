import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
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

jest.mock('@/lib/auth/offline-identity', () => ({
  getLocalIdentity: jest.fn(() => Promise.resolve(null)),
  persistLocalIdentity: jest.fn(async (userId: string) => ({
    version: 1,
    userId
  }))
}))

jest.mock('@/lib/auth/sign-out', () => ({
  disconnectAndSignOut: jest.fn(async () => {})
}))

jest.mock('@/lib/auth/session-runtime', () => {
  const actual = jest.requireActual('@/lib/auth/session-runtime')
  return {
    ...actual,
    useSessionRuntime: () => ({
      useSession: () => ({
        data: { user: { id: 'user-1', name: 'Alice' } },
        isPending: false
      }),
      getSession: jest.fn(),
      isOnline: jest.fn(() => Promise.resolve(true)),
      onConnectivityChange: () => () => {},
      onForeground: () => () => {}
    })
  }
})

import {
  LocalIdentityProvider,
  useLocalIdentity
} from '@/lib/auth/local-identity-context'
import { getLocalIdentity } from '@/lib/auth/offline-identity'
import {
  SessionStatusProvider,
  useSessionStatus,
  type SessionStatus
} from '@/lib/auth/session-status-context'

import {
  StartupCoordinator,
  useStartupState,
  type StartupPhase
} from '../coordinator'
import type { PowerSyncRuntime } from '../runtime'

const getLocalIdentityMock = getLocalIdentity as jest.Mock

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

interface ProbeValue {
  phase: StartupPhase
  splashHidden: boolean
  applyIdentity: (identity: { version: 1; userId: string } | null) => void
  setSessionStatus: (status: SessionStatus) => void
}

const probeRef: { current: ProbeValue | null } = { current: null }

function Probe() {
  const state = useStartupState()
  const { applyIdentity } = useLocalIdentity()
  const { setSessionStatus } = useSessionStatus()
  probeRef.current = {
    phase: state.phase,
    splashHidden: state.splashHidden,
    applyIdentity,
    setSessionStatus
  }
  return null
}

function renderCoordinator(handle: FakeRuntimeHandle) {
  probeRef.current = null
  return render(
    <LocalIdentityProvider>
      <SessionStatusProvider>
        <StartupCoordinator runtime={handle.runtime}>
          <Probe />
          <View testID="children" />
        </StartupCoordinator>
      </SessionStatusProvider>
    </LocalIdentityProvider>
  )
}

function probe(): ProbeValue {
  if (!probeRef.current) throw new Error('Probe has not mounted yet')
  return probeRef.current
}

beforeEach(() => {
  jest.clearAllMocks()
  getLocalIdentityMock.mockResolvedValue({ version: 1, userId: 'user-1' })
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

    // Wait until LocalIdentityProvider finishes its async mount effect and
    // the coordinator advances into initializing-db.
    await waitFor(() => expect(probe().phase).toBe('initializing-db'))
    expect(fake.initMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      fake.resolveInit()
    })
    expect(probe().phase).toBe('first-sync')

    // Valid session triggers connect once we reach first-sync.
    await act(async () => {
      probe().setSessionStatus('valid')
    })
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

      // LocalIdentityProvider's async effect still needs to resolve —
      // flushing microtasks inside an act() unblocks it.
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
      expect(probe().phase).toBe('initializing-db')

      // Burn 10s off T1's 15s budget, then drop identity. The init-effect
      // cleanup must clear T1 — otherwise it will still fire 5s later.
      await act(async () => {
        jest.advanceTimersByTime(10_000)
      })
      await act(async () => {
        probe().applyIdentity(null)
      })
      expect(probe().phase).toBe('unauthenticated')

      // Re-auth: new initializing-db + fresh timer T2 with a full 15s budget.
      await act(async () => {
        probe().applyIdentity({ version: 1, userId: 'user-1' })
      })
      expect(probe().phase).toBe('initializing-db')
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
      probe().applyIdentity(null)
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
      probe().setSessionStatus('valid')
      fake.setHasSynced(true)
    })
    await waitFor(() => expect(probe().phase).toBe('ready'))

    await act(async () => {
      probe().applyIdentity(null)
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

    await act(async () => {
      probe().setSessionStatus('valid')
    })
    expect(fake.connectMock).toHaveBeenCalledTimes(1)
    expect(fake.disconnectMock).not.toHaveBeenCalled()

    await act(async () => {
      probe().setSessionStatus('expired')
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

    await act(async () => {
      probe().setSessionStatus('valid')
    })
    expect(fake.connectMock).toHaveBeenCalledTimes(1)

    // Session expires (e.g., token blip), then returns.
    await act(async () => {
      probe().setSessionStatus('expired')
    })
    await act(async () => {
      probe().setSessionStatus('valid')
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
      probe().setSessionStatus('valid')
      fake.setHasSynced(true)
    })
    await waitFor(() => expect(probe().phase).toBe('ready'))
    expect(probe().splashHidden).toBe(true)
  })
})
