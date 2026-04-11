// Reactive bindings for the session lifecycle policy. Same pure functions as
// the mutation path (`src/data/shared/sessions/policy.ts`), but the facts
// arrive via `useDrizzleQuery` subscriptions instead of the async facts
// provider. Lets UI disable affordances before the user taps them.

import { and, eq, isNull } from 'drizzle-orm'

import { getGeneratorAuthzFactsQuery } from '@/data/client/authz/provider'
import { generatorSessions } from '@/data/client/db-schema'
import { getGeneratorSession } from '@/data/client/queries'
import { policy as authzPolicy } from '@/data/shared/authz'
import {
  logManualSessionPolicy,
  startSessionPolicy,
  stopSessionPolicy,
  updateSessionPolicy,
  type PolicyResult
} from '@/data/shared/sessions/policy'
import type { SessionRef } from '@/data/shared/sessions'
import { useDrizzleQuery } from '@/lib/hooks/use-drizzle-query'
import { db } from '@/lib/powersync/database'

export type PolicyView =
  | { status: 'loading' }
  | ({ status: 'ready' } & PolicyResult)

const LOADING: PolicyView = { status: 'loading' }

interface GeneratorAuthzFactsView {
  loading: boolean
  generatorExists: boolean
  hasGeneratorAccess: boolean
}

// Reactive driver over the same SQL the async provider uses — see
// `getGeneratorAuthzFactsQuery` in authz/provider.ts. Returns `loading: true`
// while inputs are missing or the subscription hasn't produced rows yet,
// otherwise derives the two booleans the policies need.
function useGeneratorAuthzFacts(
  userId: string | null | undefined,
  generatorId: string | null | undefined
): GeneratorAuthzFactsView {
  const query =
    userId && generatorId
      ? getGeneratorAuthzFactsQuery(db, userId, generatorId)
      : undefined

  const { data, isLoading } = useDrizzleQuery(query)

  if (!userId || !generatorId || isLoading)
    return { loading: true, generatorExists: false, hasGeneratorAccess: false }

  const row = data[0]
  if (!row)
    return { loading: false, generatorExists: false, hasGeneratorAccess: false }

  return {
    loading: false,
    generatorExists: true,
    hasGeneratorAccess: authzPolicy.canAccessGenerator(
      userId,
      row.orgAdminUserId,
      row.hasAssignment === 1
    )
  }
}

export function useCanStartSession(
  userId: string | null | undefined,
  generatorId: string | null | undefined
): PolicyView {
  const authz = useGeneratorAuthzFacts(userId, generatorId)

  const openQuery = generatorId
    ? db
        .select({ id: generatorSessions.id })
        .from(generatorSessions)
        .where(
          and(
            eq(generatorSessions.generatorId, generatorId),
            isNull(generatorSessions.stoppedAt)
          )
        )
        .limit(1)
    : undefined
  const { data: openRows, isLoading: openLoading } = useDrizzleQuery(openQuery)

  if (!userId || !generatorId || authz.loading || openLoading) return LOADING

  const result = startSessionPolicy({
    generatorExists: authz.generatorExists,
    hasGeneratorAccess: authz.hasGeneratorAccess,
    hasOpenSession: openRows.length > 0
  })
  return { status: 'ready', ...result }
}

// Shared shape for stop/update: both branch on the same `session` +
// `hasGeneratorAccess` inputs.
interface SessionContextView {
  loading: boolean
  session: SessionRef | null
  hasGeneratorAccess: boolean
}

function useSessionPolicyContext(
  userId: string | null | undefined,
  sessionId: string | null | undefined
): SessionContextView {
  const sessionQuery = sessionId ? getGeneratorSession(sessionId) : undefined
  const { data: sessionRows, isLoading: sessionLoading } =
    useDrizzleQuery(sessionQuery)

  const row = sessionRows[0]
  const generatorId = row?.generatorId ?? null

  // Second-stage subscription: we can't query authz until we've resolved the
  // session's generatorId. While the session is still loading we pass null,
  // which keeps the authz hook in its own loading state.
  const authz = useGeneratorAuthzFacts(userId, generatorId)

  if (!userId || !sessionId || sessionLoading)
    return { loading: true, session: null, hasGeneratorAccess: false }

  if (!row) return { loading: false, session: null, hasGeneratorAccess: false }

  if (authz.loading)
    return { loading: true, session: null, hasGeneratorAccess: false }

  const session: SessionRef = {
    generatorId: row.generatorId,
    startedByUserId: row.startedByUserId,
    isStopped: row.stoppedAt !== null
  }

  return {
    loading: false,
    session,
    hasGeneratorAccess: authz.hasGeneratorAccess
  }
}

export function useCanStopSession(
  userId: string | null | undefined,
  sessionId: string | null | undefined
): PolicyView {
  const ctx = useSessionPolicyContext(userId, sessionId)
  if (ctx.loading) return LOADING
  const result = stopSessionPolicy({
    session: ctx.session,
    hasGeneratorAccess: ctx.hasGeneratorAccess
  })
  return { status: 'ready', ...result }
}

export function useCanUpdateSession(
  userId: string | null | undefined,
  sessionId: string | null | undefined,
  input: { startedAt: string; stoppedAt: string } | null | undefined
): PolicyView {
  const ctx = useSessionPolicyContext(userId, sessionId)
  if (ctx.loading || !input) return LOADING
  const result = updateSessionPolicy({
    session: ctx.session,
    hasGeneratorAccess: ctx.hasGeneratorAccess,
    startedAt: input.startedAt,
    stoppedAt: input.stoppedAt,
    now: new Date()
  })
  return { status: 'ready', ...result }
}

export function useCanLogManualSession(
  userId: string | null | undefined,
  input:
    | { generatorId: string; startedAt: string; stoppedAt: string }
    | null
    | undefined
): PolicyView {
  const authz = useGeneratorAuthzFacts(userId, input?.generatorId ?? null)
  if (!userId || !input || authz.loading) return LOADING
  const result = logManualSessionPolicy({
    generatorExists: authz.generatorExists,
    hasGeneratorAccess: authz.hasGeneratorAccess,
    startedAt: input.startedAt,
    stoppedAt: input.stoppedAt,
    now: new Date()
  })
  return { status: 'ready', ...result }
}
