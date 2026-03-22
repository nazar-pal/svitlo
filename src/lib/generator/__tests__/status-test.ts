import type { GeneratorSession } from '@/data/client/db-schema'
import { computeGeneratorStatus, computeLifetimeHours } from '../status'

function session(start: string, stop: string | null): GeneratorSession {
  return {
    id: `session-${start}`,
    generatorId: 'gen-1',
    startedByUserId: 'user-1',
    stoppedByUserId: stop ? 'user-1' : null,
    startedAt: start,
    stoppedAt: stop
  }
}

function gen(maxRun: number, rest: number) {
  return { maxConsecutiveRunHours: maxRun, requiredRestHours: rest }
}

describe('computeGeneratorStatus', () => {
  it('returns available with no sessions', () => {
    const result = computeGeneratorStatus(gen(8, 4), [])
    expect(result.status).toBe('available')
    expect(result.openSession).toBeNull()
    expect(result.restEndsAt).toBeNull()
    expect(result.consecutiveRunHours).toBe(0)
  })

  it('returns running with a single open session', () => {
    const sessions = [session('2026-01-15T10:00:00Z', null)]
    const result = computeGeneratorStatus(gen(8, 4), sessions)
    expect(result.status).toBe('running')
    expect(result.openSession).toBe(sessions[0])
    expect(result.consecutiveRunHours).toBe(0)
  })

  it('accumulates hours from prior closed sessions within rest window', () => {
    const sessions = [
      // Open session started right after the closed one ended
      session('2026-01-15T13:00:00Z', null),
      // Closed session: 3 hours
      session('2026-01-15T10:00:00Z', '2026-01-15T13:00:00Z')
    ]
    const result = computeGeneratorStatus(gen(8, 4), sessions)
    expect(result.status).toBe('running')
    expect(result.consecutiveRunHours).toBe(3)
  })

  it('does not accumulate hours past a gap exceeding requiredRestHours', () => {
    const sessions = [
      // Open session
      session('2026-01-15T20:00:00Z', null),
      // Closed session with 5h gap before open (exceeds 4h rest)
      session('2026-01-15T12:00:00Z', '2026-01-15T15:00:00Z'),
      // Even earlier session
      session('2026-01-15T08:00:00Z', '2026-01-15T12:00:00Z')
    ]
    const result = computeGeneratorStatus(gen(8, 4), sessions)
    expect(result.status).toBe('running')
    // The 5h gap between 15:00 and 20:00 exceeds requiredRestHours (4)
    // so only the open session's prior block counts — none qualify
    expect(result.consecutiveRunHours).toBe(0)
  })

  it('returns available when closed sessions are below maxConsecutiveRunHours', () => {
    const sessions = [
      session('2026-01-15T10:00:00Z', '2026-01-15T12:00:00Z') // 2 hours
    ]
    const result = computeGeneratorStatus(gen(8, 4), sessions)
    expect(result.status).toBe('available')
    expect(result.consecutiveRunHours).toBe(2)
  })

  it('returns resting when hours >= max and rest period is in the future', () => {
    jest.useFakeTimers()
    // Set "now" to 2 hours after the last session stopped
    jest.setSystemTime(new Date('2026-01-15T14:00:00Z'))

    const sessions = [
      // 4h session
      session('2026-01-15T08:00:00Z', '2026-01-15T12:00:00Z'),
      // 5h session just before (gap < rest)
      session('2026-01-15T03:00:00Z', '2026-01-15T08:00:00Z')
    ]
    // Total: 9h >= 8h max, last stopped at 12:00, rest ends at 12:00 + 4h = 16:00
    // Current time is 14:00 which is before 16:00 → still resting
    const result = computeGeneratorStatus(gen(8, 4), sessions)
    expect(result.status).toBe('resting')
    expect(result.restEndsAt).toEqual(new Date('2026-01-15T16:00:00Z'))
    expect(result.consecutiveRunHours).toBe(9)

    jest.useRealTimers()
  })

  it('returns available when rest period has expired', () => {
    jest.useFakeTimers()
    // Set "now" to well after the rest period would have ended
    jest.setSystemTime(new Date('2026-01-16T00:00:00Z'))

    const sessions = [
      session('2026-01-15T08:00:00Z', '2026-01-15T12:00:00Z'),
      session('2026-01-15T03:00:00Z', '2026-01-15T08:00:00Z')
    ]
    // Total: 9h >= 8h max, rest ends at 16:00, now is midnight → rest expired
    const result = computeGeneratorStatus(gen(8, 4), sessions)
    expect(result.status).toBe('available')

    jest.useRealTimers()
  })

  it('treats exactly maxConsecutiveRunHours as resting', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15T14:00:00Z'))

    const sessions = [
      // Exactly 8 hours
      session('2026-01-15T04:00:00Z', '2026-01-15T12:00:00Z')
    ]
    const result = computeGeneratorStatus(gen(8, 4), sessions)
    expect(result.status).toBe('resting')

    jest.useRealTimers()
  })

  it('stops accumulating at a gap exceeding requiredRestHours (closed only)', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15T23:00:00Z'))

    const sessions = [
      // Recent block: 3h
      session('2026-01-15T18:00:00Z', '2026-01-15T21:00:00Z'),
      // 5h gap (exceeds 4h rest) — this session should NOT count
      session('2026-01-15T10:00:00Z', '2026-01-15T13:00:00Z')
    ]
    const result = computeGeneratorStatus(gen(8, 4), sessions)
    // Only 3h accumulated, below 8h max → available
    expect(result.status).toBe('available')
    expect(result.consecutiveRunHours).toBe(3)

    jest.useRealTimers()
  })

  it('accumulates across multiple consecutive sessions with small gaps', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15T16:00:00Z'))

    const sessions = [
      // Session 3: 2h (14:00-14:00... let me make it right)
      session('2026-01-15T12:00:00Z', '2026-01-15T14:00:00Z'), // 2h
      // 1h gap (< 4h rest)
      session('2026-01-15T08:00:00Z', '2026-01-15T11:00:00Z'), // 3h
      // 1h gap (< 4h rest)
      session('2026-01-15T04:00:00Z', '2026-01-15T07:00:00Z') // 3h
    ]
    // Total: 2 + 3 + 3 = 8h >= 8h max
    // Rest ends at 14:00 + 4h = 18:00, now is 16:00 → resting
    const result = computeGeneratorStatus(gen(8, 4), sessions)
    expect(result.status).toBe('resting')
    expect(result.consecutiveRunHours).toBe(8)

    jest.useRealTimers()
  })
})

describe('computeLifetimeHours', () => {
  it('returns 0 for empty sessions', () => {
    expect(computeLifetimeHours([])).toBe(0)
  })

  it('returns correct hours for a closed session', () => {
    const sessions = [session('2026-01-15T10:00:00Z', '2026-01-15T13:00:00Z')]
    expect(computeLifetimeHours(sessions)).toBe(3)
  })

  it('sums hours across multiple closed sessions', () => {
    const sessions = [
      session('2026-01-15T10:00:00Z', '2026-01-15T12:00:00Z'), // 2h
      session('2026-01-15T14:00:00Z', '2026-01-15T17:00:00Z') // 3h
    ]
    expect(computeLifetimeHours(sessions)).toBe(5)
  })

  it('includes elapsed time for open sessions', () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-01-15T12:00:00Z'))

    const sessions = [
      session('2026-01-15T10:00:00Z', null) // open, 2h elapsed
    ]
    expect(computeLifetimeHours(sessions)).toBe(2)

    jest.useRealTimers()
  })
})
