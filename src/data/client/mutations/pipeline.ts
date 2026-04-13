import type { z } from 'zod'

import type {
  MutationError,
  ParamFreeMutationErrorCode
} from '@/data/shared/errors'
import { failFromZod } from '@/data/shared/errors-from-zod'
import { ok, type MutationResult } from '@/data/shared/result'
import type { ClientDb } from '@/lib/powersync/database'

import type { MutationContext } from './context'

type OkBranch<T> = Extract<T, { ok: true }>

// Fail branch splits by whether the code takes params: bare codes may use
// the wide `ParamFreeMutationErrorCode` union (so `PolicyResult`-shaped
// checks assign directly); parameterized codes must supply their typed
// `params`. A check cannot return a parameterized code without them.
type CheckOutcome =
  | { ok: true }
  | { ok: false; code: ParamFreeMutationErrorCode }
  | ({ ok: false } & Extract<MutationError, { params: unknown }>)

interface MutationDef<
  TArgs extends readonly unknown[],
  TParsed,
  TCheck extends CheckOutcome
> {
  parse?: (args: TArgs) => z.ZodSafeParseResult<TParsed>
  // Short-circuit only: return a `fail(...)` to abort, or nothing to
  // continue. `validate` cannot forward data to `apply` — use `check` for
  // that.
  validate?: (args: TArgs, parsed: TParsed) => MutationResult | void
  check?: (
    ctx: MutationContext,
    args: TArgs,
    parsed: TParsed
  ) => Promise<TCheck>
  apply: (handle: {
    ctx: MutationContext
    db: ClientDb
    args: TArgs
    parsed: TParsed
    checkOk: OkBranch<TCheck>
  }) => Promise<MutationResult | void>
  tx?: boolean
}

/**
 * Declarative pipeline for client mutations — the client-side mirror of
 * `defineTableHandler` in `src/data/server/api/routers/powersync/handlers/pipeline.ts`.
 *
 * Each mutation declares the knobs that differ between mutations — Zod
 * parse (optional), a sync post-parse `validate` phase (optional), the
 * lifecycle `check` (optional), and the DB-writing `apply` callback — plus
 * an opt-in `tx` flag. Parse-error formatting, validate/check-failure
 * forwarding, and the default `ok` return are handled here.
 */
export function defineMutation<
  TArgs extends readonly unknown[],
  TParsed = undefined,
  TCheck extends CheckOutcome = CheckOutcome
>(
  ctx: MutationContext,
  def: MutationDef<TArgs, TParsed, TCheck>
): (...args: TArgs) => Promise<MutationResult> {
  return async (...args) => {
    let parsed = undefined as unknown as TParsed
    if (def.parse) {
      const r = def.parse(args)
      if (!r.success) return failFromZod(r.error)
      parsed = r.data
    }

    if (def.validate) {
      const v = def.validate(args, parsed)
      if (v && !v.ok) return v
    }

    let checkOk = undefined as unknown as OkBranch<TCheck>
    if (def.check) {
      const result = await def.check(ctx, args, parsed)
      if (!result.ok) {
        const { ok: _ok, ...error } = result
        return { ok: false, error: error as unknown as MutationError }
      }
      checkOk = result as OkBranch<TCheck>
    }

    const run = (db: ClientDb) => def.apply({ ctx, db, args, parsed, checkOk })

    const applied = def.tx
      ? await ctx.writeTx(tx => run(tx))
      : await run(ctx.db)

    return applied ?? ok
  }
}
