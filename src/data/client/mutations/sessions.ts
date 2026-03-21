import { and, eq, isNull } from 'drizzle-orm'

import { generators, generatorSessions } from '@/data/client/db-schema'
import { t } from '@/lib/i18n'
import { db } from '@/lib/powersync/database'

import {
  canAccessGenerator,
  fail,
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

  if (!gen) return fail(t('errors.generatorNotFound'))

  // Check access
  if (!(await canAccessGenerator(userId, generatorId)))
    return fail(t('errors.notAuthorizedForGenerator'))

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

  if (openSession) return fail(t('errors.generatorAlreadyActive'))

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

// No ownership check needed: PowerSync sync rules + client-side filtering ensure
// users only see activity for generators they can access (admin or assigned).
export async function deleteSession(
  userId: string,
  sessionId: string
): Promise<MutationResult> {
  const [session] = await db
    .select()
    .from(generatorSessions)
    .where(eq(generatorSessions.id, sessionId))
    .limit(1)

  if (!session) return fail(t('errors.sessionNotFound'))
  if (!session.stoppedAt) return fail(t('errors.cannotDeleteActiveSession'))

  if (!(await canAccessGenerator(userId, session.generatorId)))
    return fail(t('errors.notAuthorizedForGenerator'))

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

  if (!session) return fail(t('errors.sessionNotFound'))
  if (session.stoppedAt) return fail(t('errors.sessionAlreadyStopped'))

  if (!(await canAccessGenerator(userId, session.generatorId)))
    return fail(t('errors.notAuthorizedForGenerator'))

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

// No ownership check needed: PowerSync sync rules + client-side filtering ensure
// users only see activity for generators they can access (admin or assigned).
export async function updateSession(
  userId: string,
  sessionId: string,
  input: { startedAt: string; stoppedAt: string }
): Promise<MutationResult> {
  const [session] = await db
    .select()
    .from(generatorSessions)
    .where(eq(generatorSessions.id, sessionId))
    .limit(1)

  if (!session) return fail(t('errors.sessionNotFound'))
  if (!session.stoppedAt) return fail(t('errors.cannotEditActiveSession'))

  if (!(await canAccessGenerator(userId, session.generatorId)))
    return fail(t('errors.notAuthorizedForGenerator'))

  if (input.startedAt >= input.stoppedAt)
    return fail(t('errors.startBeforeEnd'))

  if (new Date(input.stoppedAt) > new Date())
    return fail(t('errors.endTimeInFuture'))

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

  // Check generator exists
  const [gen] = await db
    .select()
    .from(generators)
    .where(eq(generators.id, generatorId))
    .limit(1)

  if (!gen) return fail(t('errors.generatorNotFound'))

  if (!(await canAccessGenerator(userId, generatorId)))
    return fail(t('errors.notAuthorizedForGenerator'))

  if (startedAt >= stoppedAt) return fail(t('errors.startBeforeEnd'))

  if (new Date(stoppedAt) > new Date()) return fail(t('errors.endTimeInFuture'))

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
