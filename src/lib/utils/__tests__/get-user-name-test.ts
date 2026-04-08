jest.mock('@/lib/i18n', () => ({ t: (key: string) => key }))

import { getUserName } from '../get-user-name'

const users = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' }
]

describe('getUserName', () => {
  it('returns the name when user is found', () => {
    expect(getUserName(users, '1')).toBe('Alice')
  })

  it('returns fallback when user is not found', () => {
    expect(getUserName(users, 'missing')).toBe('common.unknown')
  })

  it('returns fallback for empty array', () => {
    expect(getUserName([], '1')).toBe('common.unknown')
  })

  it('returns fallback for empty string name', () => {
    expect(getUserName([{ id: '1', name: '' }], '1')).toBe('common.unknown')
  })
})
