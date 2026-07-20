import type { ParamFreeMutationErrorCode } from './errors'

// Shared result shape for pure policy modules (sessions, generators, ...).
// Policy only emits param-free codes so callers can forward `result.code`
// straight to `fail()` without extra narrowing at the call site.
export type PolicyResult =
  | { ok: true }
  | { ok: false; code: ParamFreeMutationErrorCode }

export const policyOk: PolicyResult = { ok: true }

// Annotated as just the failure variant rather than the wider
// `PolicyResult`. It stays assignable everywhere a `PolicyResult` is
// expected, while domains whose success branch carries extras
// (`AcceptInvitationResult`, `MemberLifecycleResult`, ...) can still infer
// their own result union from a `fail(...)` return. Widening this back to
// `PolicyResult` reintroduces those inference failures.
export const policyFail = (
  code: ParamFreeMutationErrorCode
): { ok: false; code: ParamFreeMutationErrorCode } => ({
  ok: false,
  code
})
