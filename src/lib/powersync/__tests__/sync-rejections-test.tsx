import { renderHook, act } from '@testing-library/react-native'

import {
  addRejection,
  clearRejections,
  useSyncRejections
} from '../sync-rejections'

beforeEach(() => {
  clearRejections()
})

const entry = { table: 'user', op: 'insert', id: '1', reason: 'duplicate' }

describe('addRejection', () => {
  it('appends entry with auto-generated timestamp', () => {
    const before = Date.now()
    addRejection(entry)
    const { result } = renderHook(() => useSyncRejections())
    expect(result.current).toHaveLength(1)
    expect(result.current[0]).toMatchObject(entry)
    expect(result.current[0].timestamp).toBeGreaterThanOrEqual(before)
    expect(result.current[0].timestamp).toBeLessThanOrEqual(Date.now())
  })

  it('preserves existing entries in order', () => {
    const second = { table: 'gen', op: 'delete', id: '2', reason: 'fk' }
    addRejection(entry)
    addRejection(second)
    const { result } = renderHook(() => useSyncRejections())
    expect(result.current).toHaveLength(2)
    expect(result.current[0]).toMatchObject(entry)
    expect(result.current[1]).toMatchObject(second)
  })

  it('creates new array reference (required for useSyncExternalStore)', () => {
    addRejection(entry)
    const { result } = renderHook(() => useSyncRejections())
    const ref1 = result.current
    act(() => addRejection({ ...entry, id: '2' }))
    expect(result.current).not.toBe(ref1)
  })
})

describe('clearRejections', () => {
  it('removes all entries', () => {
    addRejection(entry)
    addRejection({ ...entry, id: '2' })
    clearRejections()
    const { result } = renderHook(() => useSyncRejections())
    expect(result.current).toHaveLength(0)
  })

  it('creates new array reference', () => {
    addRejection(entry)
    const { result } = renderHook(() => useSyncRejections())
    const ref1 = result.current
    act(() => clearRejections())
    expect(result.current).not.toBe(ref1)
  })
})

describe('useSyncRejections', () => {
  it('returns stable reference when no mutation', () => {
    addRejection(entry)
    const { result, rerender } = renderHook(() => useSyncRejections())
    const ref1 = result.current
    rerender({})
    expect(result.current).toBe(ref1)
  })
})
