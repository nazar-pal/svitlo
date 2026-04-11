import { fail, ok, type MutationResult } from './types'

type Shielded<TOk> =
  | { status: 'ok'; data: TOk }
  | { status: 'consume'; result: MutationResult }

type CheckResult = { ok: true } | { ok: false; code: string }
type OkBranch<T> = Extract<T, { ok: true }>

/**
 * Lost-ack replay shield for delete/update handlers.
 *
 * PowerSync re-uploads writes whose ack never reached the client. When the
 * server has already applied the original, the shared lifecycle check reports
 * an `*_NOT_FOUND`. Translate those into silent successes so the sync queue
 * advances past the already-applied delete instead of recording a spurious
 * rejection. Any other failure is forwarded as `fail(code)`.
 *
 * Caller shape:
 *
 * ```
 * const shielded = replayShieldNotFound(
 *   await checks.deleteSession(userId, id),
 *   'SESSION_NOT_FOUND'
 * )
 * if (shielded.status === 'consume') return shielded.result
 * // shielded.data is the unwrapped { ok: true; … } success
 * ```
 */
export function replayShieldNotFound<T extends CheckResult>(
  result: T,
  notFoundCode: string
): Shielded<OkBranch<T>> {
  if (result.ok) return { status: 'ok', data: result as OkBranch<T> }
  if (result.code === notFoundCode) return { status: 'consume', result: ok }
  return { status: 'consume', result: fail(result.code) }
}

/**
 * Second replay shape: PowerSync may resend an INSERT whose ack was lost.
 * When the shared check rejects the replay because the row already exists
 * (e.g. unique constraint trips `USER_ALREADY_ASSIGNED`), translate that
 * into a silent ok so the sync queue advances past the already-applied
 * insert. Callers that need a second fetch to confirm the replay is owned
 * by the caller (sessions) inspect the result themselves.
 */
export function replayShieldAlreadyExists<T extends CheckResult>(
  result: T,
  alreadyExistsCode: string
): Shielded<OkBranch<T>> {
  if (result.ok) return { status: 'ok', data: result as OkBranch<T> }
  if (result.code === alreadyExistsCode)
    return { status: 'consume', result: ok }
  return { status: 'consume', result: fail(result.code) }
}
