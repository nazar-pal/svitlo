import { eq } from 'drizzle-orm'

import { generatorSessions } from '@/data/server/db-schema'
import { createServerAuthz } from '@/data/server/authz'

import { replayShieldNotFound } from './replay'
import { transformSyncRow } from '../transform'
import { fail, ok, type Insert, type TableHandler } from './types'

export const handleGeneratorSessions: TableHandler = async ctx => {
  const { db, userId, op, id, data } = ctx
  const checks = ctx.checks.sessions

  if (op === 'insert') {
    const values = transformSyncRow(generatorSessions, data)
    const generatorId = values.generatorId as string

    const result = await checks.startSession(userId, generatorId)
    if (!result.ok) {
      // Lost-ack replay: PowerSync resends the same CRUD entry (same `id`,
      // same user) when the client never saw the original upload ack. When
      // that happens the replay trips `GENERATOR_ALREADY_ACTIVE` because
      // the first upload's open session is still there. If a row already
      // exists under this exact `id` and was started by the same user,
      // treat the replay as already-applied and return `ok` so the sync
      // queue advances silently. The `replayShieldAlreadyExists` helper
      // doesn't fit here because we need the second fetch to confirm the
      // replay is owned by the caller before consuming the failure.
      if (result.code === 'GENERATOR_ALREADY_ACTIVE') {
        const existing = await db.query.generatorSessions.findFirst({
          where: eq(generatorSessions.id, id),
          columns: { startedByUserId: true }
        })
        if (existing && existing.startedByUserId === userId) return ok
      }
      return fail(result.code)
    }

    // Belt-and-braces: the policy's `hasOpenSessionForGenerator` check is
    // the primary guard against concurrent sessions, but a very late replay
    // (after the original session has since been stopped) could slip past
    // it and hit a PK conflict. `onConflictDoNothing` swallows that edge
    // case as a no-op instead of crashing the handler.
    await db
      .insert(generatorSessions)
      .values({
        ...values,
        id,
        startedByUserId: userId
      } as Insert<typeof generatorSessions>)
      .onConflictDoNothing()
    return ok
  }

  if (op === 'update') {
    // Two wire shapes reach this branch:
    //   `stopSession`  → { stopped_at, stopped_by_user_id }
    //   `updateSession` → { started_at, stopped_at } (manual time edit)
    // `started_at` presence distinguishes the two.
    if ('started_at' in data) {
      const startedAt = data.started_at as string
      const stoppedAt = data.stopped_at as string
      const result = await checks.updateSession(
        userId,
        id,
        { startedAt, stoppedAt },
        ctx.now()
      )
      if (!result.ok) return fail(result.code)

      await db
        .update(generatorSessions)
        .set({
          startedAt: new Date(startedAt),
          stoppedAt: new Date(stoppedAt)
        })
        .where(eq(generatorSessions.id, id))
      return ok
    }

    const result = await checks.stopSession(userId, id)
    if (!result.ok) return fail(result.code)

    const fields: Partial<Insert<typeof generatorSessions>> = {}
    if ('stopped_by_user_id' in data) fields.stoppedByUserId = userId
    if ('stopped_at' in data)
      fields.stoppedAt = data.stopped_at
        ? new Date(data.stopped_at as string)
        : null

    if (Object.keys(fields).length > 0)
      await db
        .update(generatorSessions)
        .set(fields)
        .where(eq(generatorSessions.id, id))

    return ok
  }

  if (op === 'delete') {
    const shielded = replayShieldNotFound(
      await checks.deleteSession(userId, id),
      'SESSION_NOT_FOUND'
    )
    if (shielded.status === 'consume') return shielded.result

    // Server-only extra: non-admins may only delete their own sessions. The
    // shared policy allows any user with generator access, matching client
    // behaviour; the server layers an ownership rule on top as defence in
    // depth for the sync protocol. Reuse the session the policy already
    // fetched — no second `findSession` round trip.
    const authz = createServerAuthz(db)
    const { session } = shielded.data
    const isAdmin = await authz.isGeneratorOrgAdmin(userId, session.generatorId)
    if (!isAdmin && session.startedByUserId !== userId)
      return fail('Can only delete your own sessions')

    await db.delete(generatorSessions).where(eq(generatorSessions.id, id))
    return ok
  }

  return fail('Invalid operation on generator_sessions')
}
