import type { z } from 'zod'

import {
  replayShieldAlreadyExists,
  replayShieldNotFound,
  type CheckResult,
  type OkBranch
} from './replay'
import { transformSyncData } from '../transform'
import {
  fail,
  ok,
  type MutationResult,
  type TableHandler,
  type WriteContext
} from './types'

// Extract the `code` literal union from a check's failure branch so the
// shield can only reference codes the check actually emits. A typo here is
// a compile error, not a silent runtime no-op.
type FailCode<T extends CheckResult> = T extends { ok: false; code: infer C }
  ? C
  : never

type ShieldSpec<TCheck extends CheckResult> =
  | { kind: 'notFound'; code: FailCode<TCheck> }
  | { kind: 'alreadyExists'; code: FailCode<TCheck> }

interface OpDef<
  TParsed = Record<string, unknown>,
  TCheck extends CheckResult = CheckResult
> {
  schema?: z.ZodType<TParsed>
  check?: (ctx: WriteContext, parsed: TParsed) => Promise<TCheck>
  shield?: ShieldSpec<TCheck>
  apply: (
    ctx: WriteContext,
    parsed: TParsed,
    checkOk: OkBranch<TCheck>
  ) => Promise<MutationResult | void>
  errorLabel?: string
}

function parseWire<T>(
  schema: z.ZodType<T>,
  data: Record<string, unknown>,
  errorLabel: string
): { ok: true; value: T } | { ok: false; result: MutationResult } {
  const transformed = transformSyncData(data)
  const parsed = schema.safeParse(transformed)
  if (!parsed.success)
    return {
      ok: false,
      result: fail(`Invalid ${errorLabel}: ${parsed.error.message}`)
    }
  return { ok: true, value: parsed.data }
}

async function runOp<TP, TC extends CheckResult>(
  ctx: WriteContext,
  opDef: OpDef<TP, TC>,
  table: string
): Promise<MutationResult> {
  const errorLabel = opDef.errorLabel ?? `${ctx.op} ${table}`

  let parsed: TP
  if (opDef.schema) {
    const r = parseWire(opDef.schema, ctx.data, errorLabel)
    if (!r.ok) return r.result
    parsed = r.value
  } else {
    parsed = transformSyncData(ctx.data) as TP
  }

  let checkOk: OkBranch<TC> | undefined
  if (opDef.check) {
    const result = await opDef.check(ctx, parsed)
    const shield = opDef.shield
    if (shield?.kind === 'notFound') {
      const shielded = replayShieldNotFound(result, shield.code)
      if (shielded.status === 'consume') return shielded.result
      checkOk = shielded.data
    } else if (shield?.kind === 'alreadyExists') {
      const shielded = replayShieldAlreadyExists(result, shield.code)
      if (shielded.status === 'consume') return shielded.result
      checkOk = shielded.data
    } else if (!result.ok) {
      return fail(result.code)
    } else {
      checkOk = result as OkBranch<TC>
    }
  }

  const applied = await opDef.apply(ctx, parsed, checkOk as OkBranch<TC>)
  return applied ?? ok
}

interface TableHandlerDef<
  IP,
  IC extends CheckResult,
  UP,
  UC extends CheckResult,
  DP,
  DC extends CheckResult
> {
  table: string
  insert?: OpDef<IP, IC>
  update?: OpDef<UP, UC>
  delete?: OpDef<DP, DC>
}

/**
 * Declarative pipeline for PowerSync table handlers.
 *
 * Each op-def declares the four knobs that differ between handlers —
 * Zod schema (optional; omit to skip whitelist), policy check (optional),
 * replay-shield behavior (optional), and the SQL-applying `apply` callback.
 * Wire transform, parse-error formatting, check+shield wiring, and the
 * default `ok` return are handled here.
 *
 * Handlers that stay imperative:
 *   - `invitations`     — delete has two policy paths (admin cancel vs invitee
 *                         decline) where the second is tried only if the first
 *                         fails with a non-replay code.
 *   - `members`         — delete layers a self-leave fallback on top of the
 *                         admin-remove path plus a shared `transferAssignments`
 *                         side effect that needs the check's ok branch data.
 *   - `sessions`        — insert does an ownership-confirming second fetch
 *                         before consuming `GENERATOR_ALREADY_ACTIVE`; update
 *                         dispatches between stop-session and time-edit shapes.
 *   - `maintenance-records` — update reuses the delete check as its rule gate
 *                         and translates one failure code ad-hoc.
 *   - `organizations`   — update runs the replay shield BEFORE parsing so a
 *                         malformed payload against an already-deleted org is
 *                         silently acked instead of surfacing a parse error.
 *                         The pipeline's parse → check order would invert that.
 *   - `user`            — single-op handler with no check/shield at all.
 */
export function defineTableHandler<
  IP = Record<string, unknown>,
  IC extends CheckResult = CheckResult,
  UP = Record<string, unknown>,
  UC extends CheckResult = CheckResult,
  DP = Record<string, unknown>,
  DC extends CheckResult = CheckResult
>(def: TableHandlerDef<IP, IC, UP, UC, DP, DC>): TableHandler {
  return async ctx => {
    if (ctx.op === 'insert' && def.insert)
      return runOp(ctx, def.insert, def.table)
    if (ctx.op === 'update' && def.update)
      return runOp(ctx, def.update, def.table)
    if (ctx.op === 'delete' && def.delete)
      return runOp(ctx, def.delete, def.table)
    return fail(`Invalid operation on ${def.table}`)
  }
}
