import { addHours, compareDesc, isFuture, parseISO } from 'date-fns'

import type { Generator, GeneratorSession } from '@/data/client/db-schema'
import { hoursBetween } from '@/lib/time'

type GeneratorStatus = 'running' | 'resting' | 'available'

interface GeneratorStatusInfo {
  status: GeneratorStatus
  openSession: GeneratorSession | null
  restEndsAt: Date | null
  consecutiveRunHours: number
}

/**
 * Compute the current state of a generator from its config and session history.
 * Sessions must be sorted by stoppedAt descending (most recent first).
 */
export function computeGeneratorStatus(
  generator: Pick<Generator, 'maxConsecutiveRunHours' | 'requiredRestHours'>,
  sessions: GeneratorSession[]
): GeneratorStatusInfo {
  // Check for an open session (running)
  const openSession = sessions.find(s => !s.stoppedAt) ?? null
  if (openSession) {
    // Walk closed sessions immediately preceding this open session to sum
    // hours already accumulated in the same consecutive run block.
    const closedBefore = sessions
      .filter(s => s.stoppedAt)
      .sort((a, b) =>
        compareDesc(parseISO(a.stoppedAt!), parseISO(b.stoppedAt!))
      )

    let consecutiveRunHours = 0
    let nextEdge: string = openSession.startedAt

    for (const session of closedBefore) {
      const gap = hoursBetween(session.stoppedAt!, nextEdge)
      if (gap >= generator.requiredRestHours) break
      consecutiveRunHours += hoursBetween(session.startedAt, session.stoppedAt!)
      nextEdge = session.startedAt
    }

    return {
      status: 'running',
      openSession,
      restEndsAt: null,
      consecutiveRunHours
    }
  }

  // Check if resting — walk backward through closed sessions
  const closedSessions = sessions
    .filter(s => s.stoppedAt)
    .sort((a, b) => compareDesc(parseISO(a.stoppedAt!), parseISO(b.stoppedAt!)))

  if (closedSessions.length === 0)
    return {
      status: 'available',
      openSession: null,
      restEndsAt: null,
      consecutiveRunHours: 0
    }

  let consecutiveHours = 0
  let previousStartedAt: string | null = null

  for (const session of closedSessions) {
    if (previousStartedAt) {
      const gap = hoursBetween(session.stoppedAt!, previousStartedAt)
      if (gap >= generator.requiredRestHours) break
    }

    consecutiveHours += hoursBetween(session.startedAt, session.stoppedAt!)
    previousStartedAt = session.startedAt

    if (consecutiveHours >= generator.maxConsecutiveRunHours) {
      const restEndsAt = addHours(
        parseISO(closedSessions[0].stoppedAt!),
        generator.requiredRestHours
      )
      if (isFuture(restEndsAt))
        return {
          status: 'resting',
          openSession: null,
          restEndsAt,
          consecutiveRunHours: consecutiveHours
        }
      break
    }
  }

  return {
    status: 'available',
    openSession: null,
    restEndsAt: null,
    consecutiveRunHours: consecutiveHours
  }
}

/**
 * Compute total lifetime hours from all sessions.
 * Includes elapsed time for any currently open session.
 */
export function computeLifetimeHours(sessions: GeneratorSession[]): number {
  let total = 0
  for (const session of sessions) {
    const end = session.stoppedAt ?? new Date().toISOString()
    total += hoursBetween(session.startedAt, end)
  }
  return total
}
