import { formatAssignedNames } from '../format-assigned-names'

describe('formatAssignedNames', () => {
  it('returns empty string for empty array', () => {
    expect(formatAssignedNames([])).toBe('')
  })

  it('returns the single name unchanged', () => {
    expect(formatAssignedNames(['Alice'])).toBe('Alice')
  })

  it('joins two names with default max=2', () => {
    expect(formatAssignedNames(['Alice', 'Bob'])).toBe('Alice, Bob')
  })

  it('overflows three names with default max=2', () => {
    expect(formatAssignedNames(['Alice', 'Bob', 'Charlie'])).toBe(
      'Alice, Bob +1'
    )
  })

  it('overflows four names with default max=2', () => {
    expect(formatAssignedNames(['Alice', 'Bob', 'Charlie', 'Dave'])).toBe(
      'Alice, Bob +2'
    )
  })

  it('respects a custom max', () => {
    expect(formatAssignedNames(['Alice', 'Bob', 'Charlie', 'Dave'], 3)).toBe(
      'Alice, Bob, Charlie +1'
    )
  })
})
