import { groupBy } from '../group-by'

describe('groupBy', () => {
  it('returns an empty map for empty input', () => {
    expect(groupBy([], () => 'x')).toEqual(new Map())
  })

  it('groups all items under a single key', () => {
    const result = groupBy([1, 2, 3], () => 'all')
    expect(result).toEqual(new Map([['all', [1, 2, 3]]]))
  })

  it('groups items into multiple keys', () => {
    const result = groupBy(['a1', 'b1', 'a2', 'b2'], s => s[0])
    expect(result).toEqual(
      new Map([
        ['a', ['a1', 'a2']],
        ['b', ['b1', 'b2']]
      ])
    )
  })

  it('preserves key insertion order', () => {
    const result = groupBy(['b', 'a', 'c'], s => s)
    expect([...result.keys()]).toEqual(['b', 'a', 'c'])
  })

  it('preserves item order within each group', () => {
    const result = groupBy([3, 1, 2, 6, 4, 5], n => (n <= 3 ? 'low' : 'high'))
    expect(result.get('low')).toEqual([3, 1, 2])
    expect(result.get('high')).toEqual([6, 4, 5])
  })

  it('works with a complex key function', () => {
    const items = [
      { dept: 'eng', name: 'Alice' },
      { dept: 'sales', name: 'Bob' },
      { dept: 'eng', name: 'Carol' }
    ]
    const result = groupBy(items, i => i.dept)
    expect(result.get('eng')?.map(i => i.name)).toEqual(['Alice', 'Carol'])
    expect(result.get('sales')?.map(i => i.name)).toEqual(['Bob'])
  })
})
