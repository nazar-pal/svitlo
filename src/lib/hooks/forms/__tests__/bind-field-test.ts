import { act, renderHook } from '@testing-library/react-native'

import { bindText, bindValue } from '../bind-field'
import { useFormState } from '../use-form-state'

describe('bindText', () => {
  it('returns the current string value and a setter that updates form state', () => {
    const { result } = renderHook(() => useFormState({ name: 'Alice' }))

    let binding = bindText(result.current, 'name')
    expect(binding.value).toBe('Alice')
    expect(binding.isInvalid).toBe(false)
    expect(binding.errorMessage).toBeUndefined()

    act(() => binding.onChangeText('Bob'))
    binding = bindText(result.current, 'name')
    expect(binding.value).toBe('Bob')
  })

  it('reports the field error when one is set', () => {
    const { result } = renderHook(() => useFormState({ name: 'Alice' }))
    act(() => result.current.setFieldErrors({ name: 'too short' }))

    const binding = bindText(result.current, 'name')
    expect(binding.isInvalid).toBe(true)
    expect(binding.errorMessage).toBe('too short')
  })
})

describe('bindValue', () => {
  it('returns the current value and a setter that updates form state', () => {
    const initial = new Date('2026-01-01T00:00:00Z')
    const { result } = renderHook(() => useFormState({ at: initial }))

    let binding = bindValue(result.current, 'at')
    expect(binding.value).toEqual(initial)

    const next = new Date('2026-02-01T00:00:00Z')
    act(() => binding.onChange(next))
    binding = bindValue(result.current, 'at')
    expect(binding.value).toEqual(next)
  })

  it('reports the field error when one is set', () => {
    const { result } = renderHook(() => useFormState({ count: 0 }))
    act(() => result.current.setFieldErrors({ count: 'must be positive' }))

    const binding = bindValue(result.current, 'count')
    expect(binding.isInvalid).toBe(true)
    expect(binding.errorMessage).toBe('must be positive')
  })
})
