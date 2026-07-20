import {
  policyFail as fail,
  policyOk as ok,
  type PolicyResult
} from '@/data/shared/policy-result'

export type { PolicyResult }

// Fact shape the session-lifecycle policy needs. Adapters fetch raw rows
// and normalize into this schema-agnostic shape so the pure rules below
// never have to know whether the underlying column is a SQLite text
// timestamp or a Postgres `timestamptz`.
export interface SessionRef {
  generatorId: string
  startedByUserId: string
  isStopped: boolean
}

// Pure session-lifecycle rules. No I/O. Callers fetch facts, then ask the
// policy. Both client (PowerSync SQLite) and server (Postgres) reuse these
// so the rules live in exactly one place. Decisions in `./decisions.ts`
// wire the facts + authz providers to these rules.

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

export const updateSessionPolicy = (facts: {
  session: SessionRef | null
  hasGeneratorAccess: boolean
  startedAt: string
  stoppedAt: string
  now: Date
}): PolicyResult => {
  if (!facts.session) return fail('SESSION_NOT_FOUND')
  if (!facts.session.isStopped) return fail('CANNOT_EDIT_ACTIVE_SESSION')
  if (!facts.hasGeneratorAccess) return fail('NOT_AUTHORIZED_FOR_GENERATOR')
  if (facts.startedAt >= facts.stoppedAt) return fail('START_BEFORE_END')
  if (new Date(facts.stoppedAt) > facts.now) return fail('END_TIME_IN_FUTURE')
  return ok
}

export const logManualSessionPolicy = (facts: {
  generatorExists: boolean
  hasGeneratorAccess: boolean
  startedAt: string
  stoppedAt: string
  now: Date
}): PolicyResult => {
  if (!facts.generatorExists) return fail('GENERATOR_NOT_FOUND')
  if (!facts.hasGeneratorAccess) return fail('NOT_AUTHORIZED_FOR_GENERATOR')
  if (facts.startedAt >= facts.stoppedAt) return fail('START_BEFORE_END')
  if (new Date(facts.stoppedAt) > facts.now) return fail('END_TIME_IN_FUTURE')
  return ok
}
