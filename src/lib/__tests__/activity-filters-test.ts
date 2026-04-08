jest.mock('@/lib/i18n', () => ({ t: (key: string) => key }))

import { FILTERS, filterLabel, type Filter } from '../activity-filters'

describe('FILTERS', () => {
  it('contains expected values', () => {
    expect(FILTERS).toEqual(['all', 'sessions', 'maintenance'])
  })
})

describe('filterLabel', () => {
  it.each([
    ['all', 'filters.all'],
    ['sessions', 'filters.sessions'],
    ['maintenance', 'filters.maintenance']
  ] as const)('returns correct translation key for %s', (filter, expected) => {
    expect(filterLabel(filter as Filter)).toBe(expected)
  })
})
