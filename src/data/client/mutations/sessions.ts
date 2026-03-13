import { addHours, isFuture, parseISO } from 'date-fns'
import { and, desc, eq, isNull, isNotNull } from 'drizzle-orm'

import { generators, generatorSessions } from '@/data/client/db-schema'
import { hoursBetween } from '@/lib/time'
import { db } from '@/lib/powersync/database'

import {
  canAccessGenerator,
  fail,
  isGeneratorOrgAdmin,
  newId,
  nowISO,
  ok,
  type MutationResult
} from './helpers'

/**
 * Determine if the generator is currently in a mandatory rest period.
 *
 * Walk backward through closed sessions to find the current consecutive run
 * streak. If the streak meets or exceeds maxConsecutiveRunHours, the generator
 * is resting until the last session's stoppedAt + requiredRestHours.
 */
async function isGeneratorResting(
  generatorId: string,
  maxConsecutiveRunHours: number,
  requiredRestHours: number
): Promise<boolean> {
  // Get closed sessions ordered most recent first
  const closedSessions = await db
    .select({
      startedAt: generatorSessions.startedAt,
      stoppedAt: generatorSessions.stoppedAt
    })
    .from(generatorSessions)
    .where(
      and(
        eq(generatorSessions.generatorId, generatorId),
        isNotNull(generatorSessions.stoppedAt)
      )
    )
    .orderBy(desc(generatorSessions.stoppedAt))

  if (closedSessions.length === 0) return false

  // Walk backward to compute the current consecutive run streak.
  // If there's a gap >= requiredRestHours between sessions, the generator
  // already rested — only count hours from the current streak.
  let consecutiveHours = 0
  let previousStartedAt: string | null = null

  for (const session of closedSessions) {
    if (previousStartedAt) {
      const gap = hoursBetween(session.stoppedAt!, previousStartedAt)
      if (gap >= requiredRestHours) break
    }

    consecutiveHours += hoursBetween(session.startedAt, session.stoppedAt!)
    previousStartedAt = session.startedAt

    if (consecutiveHours >= maxConsecutiveRunHours) {
      const restEndsAt = addHours(
        parseISO(closedSessions[0].stoppedAt!),
        requiredRestHours
      )
      return isFuture(restEndsAt)
    }
  }

  return false
}

export async function startSession(
  userId: string,
  generatorId: string
): Promise<MutationResult> {
  // Get generator details
  const [gen] = await db
    .select()
    .from(generators)
    .where(eq(generators.id, generatorId))
    .limit(1)

  if (!gen) return fail('Generator not found')

  // Check access
  if (!(await canAccessGenerator(userId, generatorId)))
    return fail('Not authorized for this generator')

  // Check no open session exists (generator is not running)
  const [openSession] = await db
    .select({ id: generatorSessions.id })
    .from(generatorSessions)
    .where(
      and(
        eq(generatorSessions.generatorId, generatorId),
        isNull(generatorSessions.stoppedAt)
      )
    )
    .limit(1)

  if (openSession) return fail('Generator already has an active session')

  // Check generator is not in mandatory rest period
  const resting = await isGeneratorResting(
    generatorId,
    gen.maxConsecutiveRunHours,
    gen.requiredRestHours
  )
  if (resting) return fail('Generator is in mandatory rest period')

  // Insert new session
  const now = nowISO()
  await db.insert(generatorSessions).values({
    id: newId(),
    generatorId,
    startedByUserId: userId,
    stoppedByUserId: null,
    startedAt: now,
    stoppedAt: null
  })

  return ok
}

export async function deleteSession(
  userId: string,
  sessionId: string
): Promise<MutationResult> {
  const [session] = await db
    .select()
    .from(generatorSessions)
    .where(eq(generatorSessions.id, sessionId))
    .limit(1)

  if (!session) return fail('Session not found')
  if (!session.stoppedAt) return fail('Cannot delete an in-progress session')

  const isAdmin = await isGeneratorOrgAdmin(userId, session.generatorId)
  if (!isAdmin) {
    if (!(await canAccessGenerator(userId, session.generatorId)))
      return fail('Not authorized for this generator')
    if (session.startedByUserId !== userId)
      return fail('You can only delete your own sessions')
  }

  await db.delete(generatorSessions).where(eq(generatorSessions.id, sessionId))

  return ok
}

export async function stopSession(
  userId: string,
  sessionId: string
): Promise<MutationResult> {
  // Find the session
  const [session] = await db
    .select()
    .from(generatorSessions)
    .where(eq(generatorSessions.id, sessionId))
    .limit(1)

  if (!session) return fail('Session not found')
  if (session.stoppedAt) return fail('Session is already stopped')

  if (!(await canAccessGenerator(userId, session.generatorId)))
    return fail('Not authorized for this generator')

  // Stop the session
  await db
    .update(generatorSessions)
    .set({
      stoppedAt: nowISO(),
      stoppedByUserId: userId
    })
    .where(eq(generatorSessions.id, sessionId))

  return ok
}
