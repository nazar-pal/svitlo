import type { z } from 'zod'

import type { MutationError } from '@/data/shared/errors'
import { failFromZod } from '@/data/shared/errors-from-zod'
import { ok, type MutationResult } from '@/data/shared/result'
import type { ClientDb } from '@/lib/powersync/database'

import type { MutationContext } from './context'

type OkBranch<T> = Extract<T, { ok: true }>

// Fail branch is any `{ ok: false; code: string }` shape. Decision-facade
// checks also carry `facts` on both branches (that's how the async adapter
// attaches already-fetched rows for defence-in-depth) — the extra field is
// accepted via the open index signature on the ok branch. Parameterized
// codes must still supply their typed `params`.
type CheckOutcome =
  | { ok: true; [k: string]: unknown }
  | { ok: false; code: string; [k: string]: unknown }
  | ({ ok: false } & Extract<MutationError, { params: unknown }>)

type ValidateOutcome<TVali> =
  | MutationResult // fail → abort
  | { validated: TVali } // continue, forward data to apply
  | void // continue, no data forwarded

interface MutationDef<
  TArgs extends readonly unknown[],
  TParsed,
  TCheck extends CheckOutcome,
  TVali = undefined
> {
  parse?: (args: TArgs) => z.ZodSafeParseResult<TParsed>
  validate?: (args: TArgs, parsed: TParsed) => ValidateOutcome<TVali>
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
    validated: TVali
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
  TCheck extends CheckOutcome = CheckOutcome,
  TVali = undefined
>(
  ctx: MutationContext,
  def: MutationDef<TArgs, TParsed, TCheck, TVali>
): (...args: TArgs) => Promise<MutationResult> {
  return async (...args) => {
    let parsed = undefined as unknown as TParsed
    if (def.parse) {
      const r = def.parse(args)
      if (!r.success) return failFromZod(r.error)
      parsed = r.data
    }

    let validated = undefined as unknown as TVali
    if (def.validate) {
      const v = def.validate(args, parsed)
      if (v) {
        if ('validated' in v) {
          validated = (v as { validated: TVali }).validated
        } else if (!v.ok) {
          return v
        }
      }
    }

    let checkOk = undefined as unknown as OkBranch<TCheck>
    if (def.check) {
      const result = await def.check(ctx, args, parsed)
      if (!result.ok) {
        // Decision-facade checks carry `facts` on every branch; strip it
        // before surfacing as a `MutationError` so the wire shape stays
        // `{ code, params? }` exactly as the discriminated union allows.
        const asAny = result as Record<string, unknown>
        const error: Record<string, unknown> = { code: asAny.code }
        if ('params' in asAny) error.params = asAny.params
        return { ok: false, error: error as unknown as MutationError }
      }
      checkOk = result as OkBranch<TCheck>
    }

    const run = (db: ClientDb) =>
      def.apply({ ctx, db, args, parsed, validated, checkOk })

    const applied = def.tx
      ? await ctx.writeTx(tx => run(tx))
      : await run(ctx.db)

    return applied ?? ok
  }
}
