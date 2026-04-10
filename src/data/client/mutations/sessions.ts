import { eq } from 'drizzle-orm'

import { canAccessGenerator } from '@/data/client/authz'
import { generatorSessions } from '@/data/client/db-schema'
import {
  getGeneratorById,
  getGeneratorSessionById,
  getOpenSessionForGenerator
} from '@/data/client/queries'
import { db } from '@/lib/powersync/database'

import { fail, newId, nowISO, ok, type MutationResult } from './helpers'

export async function startSession(
  userId: string,
  generatorId: string
): Promise<MutationResult> {
  const gen = await getGeneratorById(generatorId)
  if (!gen) return fail('GENERATOR_NOT_FOUND')

  if (!(await canAccessGenerator(userId, generatorId)))
    return fail('NOT_AUTHORIZED_FOR_GENERATOR')

  // Check no open session exists (generator is not running)
  const openSession = await getOpenSessionForGenerator(generatorId)
  if (openSession) return fail('GENERATOR_ALREADY_ACTIVE')

  await db.insert(generatorSessions).values({
    id: newId(),
    generatorId,
    startedByUserId: userId,
    stoppedByUserId: null,
    startedAt: nowISO(),
    stoppedAt: null
  })

  return ok
}

// No ownership check needed: PowerSync sync rules + client-side filtering ensure
// users only see activity for generators they can access (admin or assigned).
export async function deleteSession(
  userId: string,
  sessionId: string
): Promise<MutationResult> {
  const session = await getGeneratorSessionById(sessionId)

  if (!session) return fail('SESSION_NOT_FOUND')
  if (!session.stoppedAt) return fail('CANNOT_DELETE_ACTIVE_SESSION')

  if (!(await canAccessGenerator(userId, session.generatorId)))
    return fail('NOT_AUTHORIZED_FOR_GENERATOR')

  await db.delete(generatorSessions).where(eq(generatorSessions.id, sessionId))

  return ok
}

export async function stopSession(
  userId: string,
  sessionId: string
): Promise<MutationResult> {
  const session = await getGeneratorSessionById(sessionId)

  if (!session) return fail('SESSION_NOT_FOUND')
  if (session.stoppedAt) return fail('SESSION_ALREADY_STOPPED')

  if (!(await canAccessGenerator(userId, session.generatorId)))
    return fail('NOT_AUTHORIZED_FOR_GENERATOR')

  await db
    .update(generatorSessions)
    .set({
      stoppedAt: nowISO(),
      stoppedByUserId: userId
    })
    .where(eq(generatorSessions.id, sessionId))

  return ok
}

// No ownership check needed: PowerSync sync rules + client-side filtering ensure
// users only see activity for generators they can access (admin or assigned).
export async function updateSession(
  userId: string,
  sessionId: string,
  input: { startedAt: string; stoppedAt: string }
): Promise<MutationResult> {
  const session = await getGeneratorSessionById(sessionId)

  if (!session) return fail('SESSION_NOT_FOUND')
  if (!session.stoppedAt) return fail('CANNOT_EDIT_ACTIVE_SESSION')

  if (!(await canAccessGenerator(userId, session.generatorId)))
    return fail('NOT_AUTHORIZED_FOR_GENERATOR')

  if (input.startedAt >= input.stoppedAt) return fail('START_BEFORE_END')

  if (new Date(input.stoppedAt) > new Date()) return fail('END_TIME_IN_FUTURE')

  await db
    .update(generatorSessions)
    .set({
      startedAt: input.startedAt,
      stoppedAt: input.stoppedAt
    })
    .where(eq(generatorSessions.id, sessionId))

  return ok
}

export async function logManualSession(
  userId: string,
  input: { generatorId: string; startedAt: string; stoppedAt: string }
): Promise<MutationResult> {
  const { generatorId, startedAt, stoppedAt } = input

  const gen = await getGeneratorById(generatorId)
  if (!gen) return fail('GENERATOR_NOT_FOUND')

  if (!(await canAccessGenerator(userId, generatorId)))
    return fail('NOT_AUTHORIZED_FOR_GENERATOR')

  if (startedAt >= stoppedAt) return fail('START_BEFORE_END')

  if (new Date(stoppedAt) > new Date()) return fail('END_TIME_IN_FUTURE')

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
