import type { db } from '@/data/server'

import type { ServerLifecycleChecks } from './checks'

// Server-side handlers return free-form string errors that flow back through
// the PowerSync wire contract for connector-side logging. These are
// developer/audit messages, not user-facing strings — the client-facing
// structured `MutationError` contract lives in `@/data/shared/errors.ts`
// and is used only by client mutations.
export type MutationResult = { ok: true } | { ok: false; error: string }

export const ok: MutationResult = { ok: true }
export const fail = (error: string): MutationResult => ({ ok: false, error })

export type Db = typeof db

export type Insert<T extends { $inferInsert: unknown }> = T['$inferInsert']

export interface WriteContext {
  db: Db
  userId: string
  userEmail: string
  op: 'insert' | 'update' | 'delete'
  id: string
  data: Record<string, unknown>
  now: () => Date
  checks: ServerLifecycleChecks
}

export type TableHandler = (ctx: WriteContext) => Promise<MutationResult>
