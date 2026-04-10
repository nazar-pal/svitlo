import type { AuthzChecks } from '@/data/shared/authz'

import type { SessionFactsProvider, SessionRef } from './facts'
import * as policy from './policy'
import type { PolicyResult } from './policy'

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
      return policy.startSessionPolicy({
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
      return policy.stopSessionPolicy({ session, hasGeneratorAccess })
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
      const result = policy.deleteSessionPolicy({ session, hasGeneratorAccess })
      if (!result.ok) return result
      return { ok: true, session }
    },

    async updateSession(userId, sessionId, input, now) {
      const session = await facts.findSession(sessionId)
      const hasGeneratorAccess = session
        ? await authz.canAccessGenerator(userId, session.generatorId)
        : false
      return policy.updateSessionPolicy({
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
      return policy.logManualSessionPolicy({
        generatorExists,
        hasGeneratorAccess,
        startedAt: input.startedAt,
        stoppedAt: input.stoppedAt,
        now
      })
    }
  }
}
