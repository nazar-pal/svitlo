import { act, renderHook } from '@testing-library/react-native'

import { useFormState } from '../use-form-state'

describe('useFormState', () => {
  it('initializes with the provided values and clean state', () => {
    const { result } = renderHook(() =>
      useFormState({ name: 'Alice', age: 30 })
    )
    expect(result.current.values).toEqual({ name: 'Alice', age: 30 })
    expect(result.current.isDirty).toBe(false)
    expect(result.current.fieldErrors).toEqual({})
  })

  it('marks the form as dirty after set', () => {
    const { result } = renderHook(() => useFormState({ name: 'Alice' }))
    act(() => result.current.set('name', 'Bob'))
    expect(result.current.values.name).toBe('Bob')
    expect(result.current.isDirty).toBe(true)
  })

  it('returns to clean when values match the pristine snapshot', () => {
    const { result } = renderHook(() => useFormState({ name: 'Alice' }))
    act(() => result.current.set('name', 'Bob'))
    expect(result.current.isDirty).toBe(true)
    act(() => result.current.set('name', 'Alice'))
    expect(result.current.isDirty).toBe(false)
  })

  it('compares Date values structurally for dirty tracking', () => {
    const initial = new Date('2026-01-01T00:00:00Z')
    const { result } = renderHook(() => useFormState({ at: initial }))
    act(() => result.current.set('at', new Date('2026-01-01T00:00:00Z')))
    expect(result.current.isDirty).toBe(false)
    act(() => result.current.set('at', new Date('2026-02-01T00:00:00Z')))
    expect(result.current.isDirty).toBe(true)
  })

  it('clears the matching field error on set', () => {
    const { result } = renderHook(() => useFormState({ name: 'Alice' }))
    act(() => result.current.setFieldErrors({ name: 'too short' }))
    expect(result.current.fieldErrors.name).toBe('too short')
    act(() => result.current.set('name', 'Bob'))
    expect(result.current.fieldErrors.name).toBeUndefined()
  })

  it('clearFieldError removes the named error only', () => {
    const { result } = renderHook(() =>
      useFormState({ name: 'Alice', age: 30 })
    )
    act(() => result.current.setFieldErrors({ name: 'a', age: 'b' }))
    act(() => result.current.clearFieldError('name'))
    expect(result.current.fieldErrors.name).toBeUndefined()
    expect(result.current.fieldErrors.age).toBe('b')
  })

  it('patch merges multiple fields at once', () => {
    const { result } = renderHook(() =>
      useFormState({ name: 'Alice', age: 30 })
    )
    act(() => result.current.patch({ name: 'Bob', age: 31 }))
    expect(result.current.values).toEqual({ name: 'Bob', age: 31 })
  })

  it('reset() returns to the pristine snapshot', () => {
    const { result } = renderHook(() => useFormState({ name: 'Alice' }))
    act(() => result.current.set('name', 'Bob'))
    act(() => result.current.reset())
    expect(result.current.values.name).toBe('Alice')
    expect(result.current.isDirty).toBe(false)
  })

  it('reset(next) re-baselines pristine to the new snapshot', () => {
    const { result } = renderHook(() => useFormState({ name: 'Alice' }))
    act(() => result.current.reset({ name: 'Carol' }))
    expect(result.current.values.name).toBe('Carol')
    expect(result.current.isDirty).toBe(false)
  })

  it('re-seeds when the initial reference identity changes', () => {
    const initialA = { name: 'Alice', age: 30 }
    const initialB = { name: 'Bob', age: 25 }
    const { result, rerender } = renderHook(
      ({ initial }: { initial: typeof initialA }) => useFormState(initial),
      { initialProps: { initial: initialA } }
    )

    act(() => result.current.set('name', 'Edited'))
    expect(result.current.isDirty).toBe(true)

    rerender({ initial: initialB })
    expect(result.current.values).toEqual(initialB)
    expect(result.current.isDirty).toBe(false)
    expect(result.current.fieldErrors).toEqual({})
  })

  it('does not re-seed when the same initial reference is passed', () => {
    const seed = { name: 'Alice' }
    const { result, rerender } = renderHook(
      ({ initial }: { initial: typeof seed }) => useFormState(initial),
      { initialProps: { initial: seed } }
    )
    act(() => result.current.set('name', 'Edited'))
    rerender({ initial: seed })
    expect(result.current.values.name).toBe('Edited')
  })
})
