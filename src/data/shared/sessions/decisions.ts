import * as authzPolicy from '@/data/shared/authz/policy'
import { defineDecision, factPlanFor } from '@/data/shared/facts/decisions'
import type { PolicyResult } from '@/data/shared/policy-result'

import {
  deleteSessionPolicy,
  logManualSessionPolicy,
  type SessionRef,
  startSessionPolicy,
  stopSessionPolicy,
  updateSessionPolicy
} from './index'

// Decision-style bindings for the session lifecycle policy. Same pure rules
// as the async orchestrator in `./index.ts`; the plan + rule split here is
// what lets `asyncAdapter` and `reactiveAdapter` drive the facts layer
// uniformly.
//
// Each plan entry names a resolver key registered in the side-specific
// FactRegistry. `authz.generator` returns the raw
// `{ orgAdminUserId, hasAssignment }` row so the rule can apply the pure
// authz predicates inline. This keeps authz-as-fact cheap and shareable
// without needing to promote the authz checks to their own decisions.

type GeneratorAuthzFact = {
  orgAdminUserId: string | null
  hasAssignment: boolean
} | null

// ── startSession ────────────────────────────────────────────────────────────

export interface StartSessionArgs {
  userId: string
  generatorId: string
}

interface StartSessionFacts {
  generator: { id: string } | null
  authzGenerator: GeneratorAuthzFact
  openSession: boolean
}

const startSessionPlan = factPlanFor<StartSessionArgs, StartSessionFacts>()

export const startSession = defineDecision<
  StartSessionArgs,
  StartSessionFacts,
  PolicyResult
>({
  id: 'sessions.startSession',
  plan: [
    startSessionPlan('generator', 'generator.byId', a => a.generatorId),
    startSessionPlan('authzGenerator', 'authz.generator', (a, f) =>
      f.generator ? { userId: a.userId, generatorId: a.generatorId } : null
    ),
    startSessionPlan('openSession', 'session.hasOpenForGenerator', (a, f) =>
      f.generator ? a.generatorId : null
    )
  ],
  rule: (args, facts) =>
    startSessionPolicy({
      generatorExists: facts.generator !== null,
      hasGeneratorAccess: facts.authzGenerator
        ? authzPolicy.canAccessGenerator(
            args.userId,
            facts.authzGenerator.orgAdminUserId,
            facts.authzGenerator.hasAssignment
          )
        : false,
      hasOpenSession: facts.openSession
    })
})

// ── stopSession ─────────────────────────────────────────────────────────────

export interface StopSessionArgs {
  userId: string
  sessionId: string
}

interface StopSessionFacts {
  session: SessionRef | null
  authzGenerator: GeneratorAuthzFact
}

const stopSessionPlan = factPlanFor<StopSessionArgs, StopSessionFacts>()

export const stopSession = defineDecision<
  StopSessionArgs,
  StopSessionFacts,
  PolicyResult
>({
  id: 'sessions.stopSession',
  plan: [
    stopSessionPlan('session', 'session.byId', a => a.sessionId),
    stopSessionPlan('authzGenerator', 'authz.generator', (a, f) =>
      f.session
        ? { userId: a.userId, generatorId: f.session.generatorId }
        : null
    )
  ],
  rule: (args, facts) =>
    stopSessionPolicy({
      session: facts.session ?? null,
      hasGeneratorAccess: facts.authzGenerator
        ? authzPolicy.canAccessGenerator(
            args.userId,
            facts.authzGenerator.orgAdminUserId,
            facts.authzGenerator.hasAssignment
          )
        : false
    })
})

// ── deleteSession ───────────────────────────────────────────────────────────

export interface DeleteSessionArgs {
  userId: string
  sessionId: string
}

export interface DeleteSessionFacts {
  session: SessionRef | null
  authzGenerator: GeneratorAuthzFact
}

const deleteSessionPlan = factPlanFor<DeleteSessionArgs, DeleteSessionFacts>()

export const deleteSession = defineDecision<
  DeleteSessionArgs,
  DeleteSessionFacts,
  PolicyResult
>({
  id: 'sessions.deleteSession',
  plan: [
    deleteSessionPlan('session', 'session.byId', a => a.sessionId),
    deleteSessionPlan('authzGenerator', 'authz.generator', (a, f) =>
      f.session
        ? { userId: a.userId, generatorId: f.session.generatorId }
        : null
    )
  ],
  rule: (args, facts) =>
    deleteSessionPolicy({
      session: facts.session ?? null,
      hasGeneratorAccess: facts.authzGenerator
        ? authzPolicy.canAccessGenerator(
            args.userId,
            facts.authzGenerator.orgAdminUserId,
            facts.authzGenerator.hasAssignment
          )
        : false
    })
})

// ── updateSession ───────────────────────────────────────────────────────────

export interface UpdateSessionArgs {
  userId: string
  sessionId: string
  startedAt: string
  stoppedAt: string
  now: Date
}

interface UpdateSessionFacts {
  session: SessionRef | null
  authzGenerator: GeneratorAuthzFact
}

const updateSessionPlan = factPlanFor<UpdateSessionArgs, UpdateSessionFacts>()

export const updateSession = defineDecision<
  UpdateSessionArgs,
  UpdateSessionFacts,
  PolicyResult
>({
  id: 'sessions.updateSession',
  plan: [
    updateSessionPlan('session', 'session.byId', a => a.sessionId),
    updateSessionPlan('authzGenerator', 'authz.generator', (a, f) =>
      f.session
        ? { userId: a.userId, generatorId: f.session.generatorId }
        : null
    )
  ],
  rule: (args, facts) =>
    updateSessionPolicy({
      session: facts.session ?? null,
      hasGeneratorAccess: facts.authzGenerator
        ? authzPolicy.canAccessGenerator(
            args.userId,
            facts.authzGenerator.orgAdminUserId,
            facts.authzGenerator.hasAssignment
          )
        : false,
      startedAt: args.startedAt,
      stoppedAt: args.stoppedAt,
      now: args.now
    })
})

// ── logManualSession ────────────────────────────────────────────────────────

export interface LogManualSessionArgs {
  userId: string
  generatorId: string
  startedAt: string
  stoppedAt: string
  now: Date
}

interface LogManualSessionFacts {
  generator: { id: string } | null
  authzGenerator: GeneratorAuthzFact
}

const logManualSessionPlan = factPlanFor<
  LogManualSessionArgs,
  LogManualSessionFacts
>()

export const logManualSession = defineDecision<
  LogManualSessionArgs,
  LogManualSessionFacts,
  PolicyResult
>({
  id: 'sessions.logManualSession',
  plan: [
    logManualSessionPlan('generator', 'generator.byId', a => a.generatorId),
    logManualSessionPlan('authzGenerator', 'authz.generator', (a, f) =>
      f.generator ? { userId: a.userId, generatorId: a.generatorId } : null
    )
  ],
  rule: (args, facts) =>
    logManualSessionPolicy({
      generatorExists: facts.generator !== null,
      hasGeneratorAccess: facts.authzGenerator
        ? authzPolicy.canAccessGenerator(
            args.userId,
            facts.authzGenerator.orgAdminUserId,
            facts.authzGenerator.hasAssignment
          )
        : false,
      startedAt: args.startedAt,
      stoppedAt: args.stoppedAt,
      now: args.now
    })
})

// Authz-derivation + authz.generator reference used downstream: the rules
// above read `authzGenerator` via `authz.generator`, so every side's
// FactRegistry must register a resolver under that key returning
// `{ orgAdminUserId: string | null; hasAssignment: boolean } | null`.
// `generator.byId` + `session.byId` + `session.hasOpenForGenerator` keys
// must return the shapes referenced in this file's Facts types.
