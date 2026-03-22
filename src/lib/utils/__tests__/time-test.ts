import {
  hoursBetween,
  formatDuration,
  formatHours,
  formatRestRemaining
} from '../time'

describe('hoursBetween', () => {
  it('returns 1.0 for dates exactly 1 hour apart', () => {
    expect(hoursBetween('2026-01-15T10:00:00Z', '2026-01-15T11:00:00Z')).toBe(1)
  })

  it('returns 0 for identical timestamps', () => {
    expect(hoursBetween('2026-01-15T10:00:00Z', '2026-01-15T10:00:00Z')).toBe(0)
  })

  it('returns fractional hours', () => {
    expect(hoursBetween('2026-01-15T10:00:00Z', '2026-01-15T10:30:00Z')).toBe(
      0.5
    )
  })

  it('returns negative value when start is after end', () => {
    expect(hoursBetween('2026-01-15T11:00:00Z', '2026-01-15T10:00:00Z')).toBe(
      -1
    )
  })
})

describe('formatDuration', () => {
  it('formats 0ms as "0:00:00"', () => {
    expect(formatDuration(0)).toBe('0:00:00')
  })

  it('formats exactly 1 hour', () => {
    expect(formatDuration(3_600_000)).toBe('1:00:00')
  })

  it('formats 1h 1m 1s correctly', () => {
    expect(formatDuration(3_661_000)).toBe('1:01:01')
  })

  it('pads minutes and seconds with leading zeros', () => {
    expect(formatDuration(60_000)).toBe('0:01:00')
    expect(formatDuration(1_000)).toBe('0:00:01')
  })
})

describe('formatHours', () => {
  it('formats sub-hour values as minutes', () => {
    expect(formatHours(0.5)).toBe('30m')
  })

  it('rounds sub-hour minutes', () => {
    expect(formatHours(0.99)).toBe('59m')
  })

  it('formats small hours with one decimal', () => {
    expect(formatHours(3.5)).toBe('3.5h')
  })

  it('formats exactly 1 hour with one decimal', () => {
    expect(formatHours(1.0)).toBe('1.0h')
  })

  it('rounds large hours to integer', () => {
    expect(formatHours(15.7)).toBe('16h')
  })

  it('formats exactly 10 hours as integer', () => {
    expect(formatHours(10)).toBe('10h')
  })
})

describe('formatRestRemaining', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15T12:00:00Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('shows only minutes when hours is 0', () => {
    expect(formatRestRemaining(new Date('2026-01-15T12:30:00Z'))).toBe('30m')
  })

  it('shows only hours when minutes is 0', () => {
    expect(formatRestRemaining(new Date('2026-01-15T14:00:00Z'))).toBe('2h')
  })

  it('shows both hours and minutes', () => {
    expect(formatRestRemaining(new Date('2026-01-15T13:30:00Z'))).toBe('1h 30m')
  })

  it('clamps to 0m when restEndsAt is in the past', () => {
    expect(formatRestRemaining(new Date('2026-01-15T11:00:00Z'))).toBe('0m')
  })
})
