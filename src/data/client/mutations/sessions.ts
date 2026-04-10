import { eq } from 'drizzle-orm'

import { generatorSessions } from '@/data/client/db-schema'
import { sessionLifecycleChecks } from '@/data/client/sessions'
import { db } from '@/lib/powersync/database'

import { fail, newId, nowISO, ok, type MutationResult } from './helpers'

export async function startSession(
  userId: string,
  generatorId: string
): Promise<MutationResult> {
  const result = await sessionLifecycleChecks.startSession(userId, generatorId)
  if (!result.ok) return fail(result.code)

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

export async function deleteSession(
  userId: string,
  sessionId: string
): Promise<MutationResult> {
  const result = await sessionLifecycleChecks.deleteSession(userId, sessionId)
  if (!result.ok) return fail(result.code)

  await db.delete(generatorSessions).where(eq(generatorSessions.id, sessionId))

  return ok
}

export async function stopSession(
  userId: string,
  sessionId: string
): Promise<MutationResult> {
  const result = await sessionLifecycleChecks.stopSession(userId, sessionId)
  if (!result.ok) return fail(result.code)

  await db
    .update(generatorSessions)
    .set({
      stoppedAt: nowISO(),
      stoppedByUserId: userId
    })
    .where(eq(generatorSessions.id, sessionId))

  return ok
}

export async function updateSession(
  userId: string,
  sessionId: string,
  input: { startedAt: string; stoppedAt: string }
): Promise<MutationResult> {
  const result = await sessionLifecycleChecks.updateSession(
    userId,
    sessionId,
    input,
    new Date()
  )
  if (!result.ok) return fail(result.code)

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
  const result = await sessionLifecycleChecks.logManualSession(
    userId,
    input,
    new Date()
  )
  if (!result.ok) return fail(result.code)

  const { generatorId, startedAt, stoppedAt } = input

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
