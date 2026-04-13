import type { z } from 'zod'

import type { ParamFreeMutationErrorCode } from '@/data/shared/errors'
import { failFromZod } from '@/data/shared/errors-from-zod'
import { fail, ok, type MutationResult } from '@/data/shared/result'
import type { ClientDb } from '@/lib/powersync/database'

import type { MutationContext } from './context'

type OkBranch<T> = Extract<T, { ok: true }>

// Every client lifecycle check returns either `{ ok: true, ...data }` — extra
// fields are forwarded to `apply` via `checkOk` — or `{ ok: false; code }`
// where `code` is a param-free MutationError code. The parameterized codes
// live on the imperative side (see escape-hatch comments in members.ts /
// generators.ts).
type CheckOutcome =
  | { ok: true }
  | { ok: false; code: ParamFreeMutationErrorCode }

interface MutationDef<
  TArgs extends readonly unknown[],
  TParsed,
  TCheck extends CheckOutcome
> {
  parse?: (args: TArgs) => z.ZodSafeParseResult<TParsed>
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
 * Each mutation declares the three knobs that differ between mutations —
 * Zod parse (optional), lifecycle check (optional), and the DB-writing
 * `apply` callback — plus an opt-in `tx` flag. Parse-error formatting,
 * check-failure forwarding, and the default `ok` return are handled here.
 *
 * Mutations that stay imperative:
 *   - `generators.createGeneratorWithMaintenance` — runs a pre-`writeTx`
 *     validation loop over `maintenanceInputs` that emits the parameterized
 *     `MAINTENANCE_TASK_VALIDATION_FAILED` code with `{ taskName }`. The
 *     pipeline's single-check model is scoped to param-free codes.
 *   - `members.removeMember` / `members.leaveOrganization` — thread
 *     `check.member` + `check.adminUserId` through
 *     `transferAssignmentsAndRemoveMember(createClientMemberWritePort(tx, ctx))`.
 *     The port needs the `tx` handle before `apply` runs, which doesn't fit
 *     the `apply({ db, checkOk })` shape.
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

    let checkOk = undefined as unknown as OkBranch<TCheck>
    if (def.check) {
      const result = await def.check(ctx, args, parsed)
      if (!result.ok) return fail(result.code)
      checkOk = result as OkBranch<TCheck>
    }

    const run = (db: ClientDb) => def.apply({ ctx, db, args, parsed, checkOk })

    const applied = def.tx
      ? await ctx.writeTx(tx => run(tx))
      : await run(ctx.db)

    return applied ?? ok
  }
}
