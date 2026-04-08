import { differential } from '../differential'

describe('differential', () => {
  const { keyBy, compareBy } = differential<{ id: string; name: string }>()
    .rowComparator!

  it('keyBy extracts the id field', () => {
    expect(keyBy({ id: 'abc', name: 'test' })).toBe('abc')
  })

  it('compareBy returns identical strings for identical objects', () => {
    const row = { id: '1', name: 'A' }
    expect(compareBy(row)).toBe(compareBy(row))
  })

  it('compareBy returns different strings when content differs', () => {
    const a = { id: '1', name: 'A' }
    const b = { id: '1', name: 'B' }
    expect(compareBy(a)).not.toBe(compareBy(b))
  })
})
