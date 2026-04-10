// Pure session-lifecycle rules. No I/O. Callers fetch facts, then ask the
// policy. Both client (PowerSync SQLite) and server (Postgres) reuse these
// so the rules live in exactly one place.

import type { ParamFreeMutationErrorCode } from '@/data/shared/errors'

import type { SessionRef } from './facts'

// Policy only emits param-free codes. Using the narrower type lets callers
// pass `result.code` straight to `fail()` without extra narrowing at the
// call site — the `fail()` overload for param-free codes fires directly.
export type PolicyResult =
  | { ok: true }
  | { ok: false; code: ParamFreeMutationErrorCode }

const ok: PolicyResult = { ok: true }
const fail = (code: ParamFreeMutationErrorCode): PolicyResult => ({
  ok: false,
  code
})

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
