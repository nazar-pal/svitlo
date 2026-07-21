import * as authzPolicy from '@/data/shared/authz/policy'
import { defineDecision, factPlanFor } from '@/data/shared/facts/decisions'

import {
  deleteSessionPolicy,
  logManualSessionPolicy,
  type PolicyResult,
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
// FactRegistry. `authz.generator` returns the shared `GeneratorAuthzFact`
// row so the rule can apply the pure authz predicates inline. This keeps
// authz-as-fact cheap and shareable without needing to promote the authz
// checks to their own decisions.

// ── startSession ────────────────────────────────────────────────────────────

interface StartSessionArgs {
  userId: string
  generatorId: string
}

interface StartSessionFacts {
  generator: { id: string } | null
  authzGenerator?: authzPolicy.GeneratorAuthzFact | null
  openSession?: boolean
}

const startSessionPlan = factPlanFor<StartSessionArgs, StartSessionFacts>()

export const startSession = defineDecision<
  StartSessionArgs,
  StartSessionFacts,
  PolicyResult
>({
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
      hasGeneratorAccess: authzPolicy.canAccessGeneratorFact(
        args.userId,
        facts.authzGenerator
      ),
      hasOpenSession: facts.openSession ?? false
    })
})

// ── stopSession ─────────────────────────────────────────────────────────────

interface StopSessionArgs {
  userId: string
  sessionId: string
}

interface StopSessionFacts {
  session: SessionRef | null
  authzGenerator?: authzPolicy.GeneratorAuthzFact | null
}

const stopSessionPlan = factPlanFor<StopSessionArgs, StopSessionFacts>()

export const stopSession = defineDecision<
  StopSessionArgs,
  StopSessionFacts,
  PolicyResult
>({
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
      session: facts.session,
      hasGeneratorAccess: authzPolicy.canAccessGeneratorFact(
        args.userId,
        facts.authzGenerator
      )
    })
})

// ── deleteSession ───────────────────────────────────────────────────────────

interface DeleteSessionArgs {
  userId: string
  sessionId: string
}

interface DeleteSessionFacts {
  session: SessionRef | null
  authzGenerator?: authzPolicy.GeneratorAuthzFact | null
}

const deleteSessionPlan = factPlanFor<DeleteSessionArgs, DeleteSessionFacts>()

export const deleteSession = defineDecision<
  DeleteSessionArgs,
  DeleteSessionFacts,
  PolicyResult
>({
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
      session: facts.session,
      hasGeneratorAccess: authzPolicy.canAccessGeneratorFact(
        args.userId,
        facts.authzGenerator
      )
    })
})

// ── updateSession ───────────────────────────────────────────────────────────

interface UpdateSessionArgs {
  userId: string
  sessionId: string
  startedAt: string
  stoppedAt: string
  now: Date
}

interface UpdateSessionFacts {
  session: SessionRef | null
  authzGenerator?: authzPolicy.GeneratorAuthzFact | null
}

const updateSessionPlan = factPlanFor<UpdateSessionArgs, UpdateSessionFacts>()

export const updateSession = defineDecision<
  UpdateSessionArgs,
  UpdateSessionFacts,
  PolicyResult
>({
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
      session: facts.session,
      hasGeneratorAccess: authzPolicy.canAccessGeneratorFact(
        args.userId,
        facts.authzGenerator
      ),
      startedAt: args.startedAt,
      stoppedAt: args.stoppedAt,
      now: args.now
    })
})

// ── logManualSession ────────────────────────────────────────────────────────

interface LogManualSessionArgs {
  userId: string
  generatorId: string
  startedAt: string
  stoppedAt: string
  now: Date
}

interface LogManualSessionFacts {
  generator: { id: string } | null
  authzGenerator?: authzPolicy.GeneratorAuthzFact | null
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
  plan: [
    logManualSessionPlan('generator', 'generator.byId', a => a.generatorId),
    logManualSessionPlan('authzGenerator', 'authz.generator', (a, f) =>
      f.generator ? { userId: a.userId, generatorId: a.generatorId } : null
    )
  ],
  rule: (args, facts) =>
    logManualSessionPolicy({
      generatorExists: facts.generator !== null,
      hasGeneratorAccess: authzPolicy.canAccessGeneratorFact(
        args.userId,
        facts.authzGenerator
      ),
      startedAt: args.startedAt,
      stoppedAt: args.stoppedAt,
      now: args.now
    })
})
