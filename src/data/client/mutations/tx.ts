import type { ClientDb } from '@/lib/powersync/database'

// `tx` is the same Drizzle session type as `ClientDb` so mutations can call
// tx.insert(...) / tx.select(...) / tx.delete(...) with full column mapping.
// Callers never see raw SQL or the snake_case row form.
export type WriteTx = <T>(fn: (tx: ClientDb) => Promise<T>) => Promise<T>

// Production adapter: delegates to the Drizzle handle's native `.transaction`,
// which on PowerSync acquires a writeLock and wraps the callback in
// BEGIN/COMMIT/ROLLBACK on that locked connection.
export function createPowerSyncWriteTx(db: ClientDb): WriteTx {
  return async fn => db.transaction(async tx => fn(tx as unknown as ClientDb))
}
