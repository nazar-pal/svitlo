import type { AuthzChecks } from '@/data/shared/authz'
import {
  policyFail as fail,
  policyOk as ok,
  type PolicyResult
} from '@/data/shared/policy-result'

export type { PolicyResult }

// --- Facts port ---

// Fact shapes the session-lifecycle policy needs. Schema-agnostic plain
// objects; adapters build them from their own Drizzle dialect.

export interface SessionRef {
  generatorId: string
  startedByUserId: string
  // Adapters normalize `stoppedAt IS NOT NULL` into this boolean so the
  // shared policy never has to know whether the underlying column is a
  // SQLite text timestamp or a Postgres `timestamptz`.
  isStopped: boolean
}

// Port: anything that can answer these three questions is a valid fact source.
// `findSession` returns `null` when the session does not exist.
export interface SessionFactsProvider {
  findSession(sessionId: string): Promise<SessionRef | null>
  generatorExists(generatorId: string): Promise<boolean>
  hasOpenSessionForGenerator(generatorId: string): Promise<boolean>
}

// --- Pure policy rules ---

// Pure session-lifecycle rules. No I/O. Callers fetch facts, then ask the
// policy. Both client (PowerSync SQLite) and server (Postgres) reuse these
// so the rules live in exactly one place.

export const startSessionPolicy = (facts: {
  generatorExists: boolean
  hasGeneratorAccess: boolean
  hasOpenSession: boolean
}): PolicyResult => {
  if (!facts.generatorExists) return fail('GENERATOR_NOT_FOUND')
  if (!facts.hasGeneratorAccess) return fail('NOT_AUTHORIZED_FOR_GENERATOR')
  if (facts.hasOpenSession) return fail('GENERATOR_ALREADY_ACTIVE')
  return ok
}

export const stopSessionPolicy = (facts: {
  session: SessionRef | null
  hasGeneratorAccess: boolean
}): PolicyResult => {
  if (!facts.session) return fail('SESSION_NOT_FOUND')
  if (facts.session.isStopped) return fail('SESSION_ALREADY_STOPPED')
  if (!facts.hasGeneratorAccess) return fail('NOT_AUTHORIZED_FOR_GENERATOR')
  return ok
}

export const deleteSessionPolicy = (facts: {
  session: SessionRef | null
  hasGeneratorAccess: boolean
}): PolicyResult => {
  if (!facts.session) return fail('SESSION_NOT_FOUND')
  if (!facts.session.isStopped) return fail('CANNOT_DELETE_ACTIVE_SESSION')
  if (!facts.hasGeneratorAccess) return fail('NOT_AUTHORIZED_FOR_GENERATOR')
  return ok
}

export const updateSessionPolicy = (params: {
  session: SessionRef | null
  hasGeneratorAccess: boolean
  startedAt: string
  stoppedAt: string
  now: Date
}): PolicyResult => {
  if (!params.session) return fail('SESSION_NOT_FOUND')
  if (!params.session.isStopped) return fail('CANNOT_EDIT_ACTIVE_SESSION')
  if (!params.hasGeneratorAccess) return fail('NOT_AUTHORIZED_FOR_GENERATOR')
  if (params.startedAt >= params.stoppedAt) return fail('START_BEFORE_END')
  if (new Date(params.stoppedAt) > params.now) return fail('END_TIME_IN_FUTURE')
  return ok
}

export const logManualSessionPolicy = (params: {
  generatorExists: boolean
  hasGeneratorAccess: boolean
  startedAt: string
  stoppedAt: string
  now: Date
}): PolicyResult => {
  if (!params.generatorExists) return fail('GENERATOR_NOT_FOUND')
  if (!params.hasGeneratorAccess) return fail('NOT_AUTHORIZED_FOR_GENERATOR')
  if (params.startedAt >= params.stoppedAt) return fail('START_BEFORE_END')
  if (new Date(params.stoppedAt) > params.now) return fail('END_TIME_IN_FUTURE')
  return ok
}

// --- Lifecycle orchestrator — wires facts + authz → policy ---

// Delete is the only check that surfaces the fetched session on success.
// The server handler needs it for a defence-in-depth ownership rule layered
// on top of the shared policy; returning it here means that rule runs
// against the same `findSession` result the policy already consumed, instead
// of paying for a second round trip.
export type DeleteSessionResult =
  | { ok: true; session: SessionRef }
  | Exclude<PolicyResult, { ok: true }>

export interface SessionLifecycleChecks {
  startSession(userId: string, generatorId: string): Promise<PolicyResult>
  stopSession(userId: string, sessionId: string): Promise<PolicyResult>
  deleteSession(userId: string, sessionId: string): Promise<DeleteSessionResult>
  updateSession(
    userId: string,
    sessionId: string,
    input: { startedAt: string; stoppedAt: string },
    now: Date
  ): Promise<PolicyResult>
  logManualSession(
    userId: string,
    input: { generatorId: string; startedAt: string; stoppedAt: string },
    now: Date
  ): Promise<PolicyResult>
}

// Single source of truth for session-lifecycle decisions. Both client
// (PowerSync SQLite) and server (Postgres) adapters funnel through here —
// each side only customises how facts get fetched and how authz is built.
export function createSessionLifecycleChecks(
  facts: SessionFactsProvider,
  authz: AuthzChecks
): SessionLifecycleChecks {
  return {
    async startSession(userId, generatorId) {
      const [generatorExists, hasGeneratorAccess, hasOpenSession] =
        await Promise.all([
          facts.generatorExists(generatorId),
          authz.canAccessGenerator(userId, generatorId),
          facts.hasOpenSessionForGenerator(generatorId)
        ])
      return startSessionPolicy({
        generatorExists,
        hasGeneratorAccess,
        hasOpenSession
      })
    },

    async stopSession(userId, sessionId) {
      const session = await facts.findSession(sessionId)
      const hasGeneratorAccess = session
        ? await authz.canAccessGenerator(userId, session.generatorId)
        : false
      return stopSessionPolicy({ session, hasGeneratorAccess })
    },

    async deleteSession(userId, sessionId) {
      const session = await facts.findSession(sessionId)
      // Narrow here so the success branch can return `session` as non-null
      // without a cast. The single source of truth for the rule is still
      // `deleteSessionPolicy`, which also handles the null case — but TS
      // can't see through the function boundary, so the narrowing has to
      // live at the call site.
      if (!session) return { ok: false, code: 'SESSION_NOT_FOUND' }
      const hasGeneratorAccess = await authz.canAccessGenerator(
        userId,
        session.generatorId
      )
      const result = deleteSessionPolicy({ session, hasGeneratorAccess })
      if (!result.ok) return result
      return { ok: true, session }
    },

    async updateSession(userId, sessionId, input, now) {
      const session = await facts.findSession(sessionId)
      const hasGeneratorAccess = session
        ? await authz.canAccessGenerator(userId, session.generatorId)
        : false
      return updateSessionPolicy({
        session,
        hasGeneratorAccess,
        startedAt: input.startedAt,
        stoppedAt: input.stoppedAt,
        now
      })
    },

    async logManualSession(userId, input, now) {
      const [generatorExists, hasGeneratorAccess] = await Promise.all([
        facts.generatorExists(input.generatorId),
        authz.canAccessGenerator(userId, input.generatorId)
      ])
      return logManualSessionPolicy({
        generatorExists,
        hasGeneratorAccess,
        startedAt: input.startedAt,
        stoppedAt: input.stoppedAt,
        now
      })
    }
  }
}
