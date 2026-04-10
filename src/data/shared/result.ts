import type {
  MutationError,
  MutationErrorCode,
  MutationErrorParamMap
} from './errors'

export type MutationResult = { ok: true } | { ok: false; error: MutationError }

export const ok: MutationResult = { ok: true }

// Overloaded signatures: codes with no params call `fail('CODE')`;
// codes with params must pass them. TypeScript enforces this at call sites.
export function fail<K extends MutationErrorCode>(
  code: K,
  ...args: MutationErrorParamMap[K] extends undefined
    ? []
    : [params: MutationErrorParamMap[K]]
): MutationResult {
  const [params] = args
  if (params === undefined)
    return { ok: false, error: { code } as MutationError }
  return { ok: false, error: { code, params } as MutationError }
}
