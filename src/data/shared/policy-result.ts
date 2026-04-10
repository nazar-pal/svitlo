import type { ParamFreeMutationErrorCode } from './errors'

// Shared result shape for pure policy modules (sessions, generators, ...).
// Policy only emits param-free codes so callers can forward `result.code`
// straight to `fail()` without extra narrowing at the call site.
export type PolicyResult =
  | { ok: true }
  | { ok: false; code: ParamFreeMutationErrorCode }

export const policyOk: PolicyResult = { ok: true }
export const policyFail = (code: ParamFreeMutationErrorCode): PolicyResult => ({
  ok: false,
  code
})
