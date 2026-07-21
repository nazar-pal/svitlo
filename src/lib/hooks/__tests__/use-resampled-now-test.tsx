import { renderHook } from '@testing-library/react-native'

import { useResampledNow } from '../use-resampled-now'

it('returns the same Date reference while the key is unchanged', () => {
  const { result, rerender } = renderHook(
    ({ key }: { key: string }) => useResampledNow(key),
    { initialProps: { key: 'a' } }
  )
  const first = result.current
  rerender({ key: 'a' })
  expect(result.current).toBe(first)
})

it('resamples a new Date when the key changes', () => {
  const { result, rerender } = renderHook(
    ({ key }: { key: string }) => useResampledNow(key),
    { initialProps: { key: 'a' } }
  )
  const first = result.current
  rerender({ key: 'b' })
  expect(result.current).not.toBe(first)
})
