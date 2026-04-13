import { act, renderHook } from '@testing-library/react-native'
import React from 'react'

import { createSyncOutbox } from '../sync-outbox'
import {
  SyncOutboxProvider,
  useSyncOutbox,
  useSyncRejections
} from '../sync-outbox-context'

function wrap(outbox: ReturnType<typeof createSyncOutbox>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <SyncOutboxProvider outbox={outbox}>{children}</SyncOutboxProvider>
  }
}

describe('useSyncOutbox', () => {
  it('throws when used outside a SyncOutboxProvider', () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    expect(() => renderHook(() => useSyncOutbox())).toThrow(
      'useSyncOutbox must be used inside SyncOutboxProvider'
    )

    consoleErrorSpy.mockRestore()
  })

  it('returns the outbox instance provided to the provider', () => {
    const outbox = createSyncOutbox({ now: () => 1 })
    const { result } = renderHook(() => useSyncOutbox(), {
      wrapper: wrap(outbox)
    })
    expect(result.current).toBe(outbox)
  })
})

describe('useSyncRejections', () => {
  it('re-renders with the latest rejections after recordRejection', () => {
    const outbox = createSyncOutbox({ now: () => 42 })
    const { result } = renderHook(() => useSyncRejections(), {
      wrapper: wrap(outbox)
    })

    expect(result.current).toEqual([])

    act(() =>
      outbox.recordRejection({
        table: 'generator',
        op: 'insert',
        id: 'g1',
        reason: 'FK violation'
      })
    )

    expect(result.current).toEqual([
      {
        table: 'generator',
        op: 'insert',
        id: 'g1',
        reason: 'FK violation',
        timestamp: 42
      }
    ])
  })

  it('returns a stable reference across renders when nothing changed', () => {
    const outbox = createSyncOutbox({ now: () => 1 })
    const { result, rerender } = renderHook(() => useSyncRejections(), {
      wrapper: wrap(outbox)
    })
    const first = result.current
    rerender({})
    expect(result.current).toBe(first)
  })

  it('returns a new reference after clear()', () => {
    const outbox = createSyncOutbox({ now: () => 1 })
    const { result } = renderHook(() => useSyncRejections(), {
      wrapper: wrap(outbox)
    })

    act(() =>
      outbox.recordRejection({
        table: 'generator',
        op: 'insert',
        id: 'g1',
        reason: 'FK violation'
      })
    )
    const populated = result.current

    act(() => outbox.clear())
    expect(result.current).not.toBe(populated)
    expect(result.current).toEqual([])
  })
})
