import { and, eq, isNull } from 'drizzle-orm'

import { generators, generatorSessions } from '@/data/client/db-schema'
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

export async function logManualSession(
  userId: string,
  input: { generatorId: string; startedAt: string; stoppedAt: string }
): Promise<MutationResult> {
  const { generatorId, startedAt, stoppedAt } = input

  // Check generator exists
  const [gen] = await db
    .select()
    .from(generators)
    .where(eq(generators.id, generatorId))
    .limit(1)

  if (!gen) return fail('Generator not found')

  if (!(await canAccessGenerator(userId, generatorId)))
    return fail('Not authorized for this generator')

  if (startedAt >= stoppedAt) return fail('Start time must be before end time')

  if (new Date(stoppedAt) > new Date())
    return fail('End time cannot be in the future')

  await db.insert(generatorSessions).values({
    id: newId(),
    generatorId,
    startedByUserId: userId,
    stoppedByUserId: userId,
    startedAt,
    stoppedAt
  })

  return ok
}
