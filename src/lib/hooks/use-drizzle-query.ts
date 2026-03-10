import { toCompilableQuery } from '@powersync/drizzle-driver'
import type { AdditionalOptions } from '@powersync/react-native'
import { useQuery } from '@powersync/react-native'
import type {
  DifferentialHookOptions,
  QueryResult,
  ReadonlyQueryResult
} from '@powersync/react/lib/hooks/watched/watch-types'
import type { Query } from 'drizzle-orm'
import { db as drizzleDb } from '../powersync/database'

/**
 * useDrizzleQuery — ergonomic Drizzle + PowerSync hook
 *
 * Why: PowerSync's `useQuery` accepts either a SQL string or a CompilableQuery. Drizzle
 * query builders produce an object with `execute()` and `toSQL()` — which needs to be
 * wrapped with `toCompilableQuery` before passing to `useQuery`.
 *
 * This helper centralizes that conversion while preserving full static typing for
 * your Drizzle row type. It mirrors `useQuery`'s overloads, so you get the same return
 * types you expect depending on the options you pass. The first parameter can be either
 * a Drizzle query object, a factory function `(db) => drizzleQuery`, or `undefined` to
 * defer execution (runs a no-op `SELECT 0 WHERE 0`).
 *
 * ----------------------------------------------------------------------------
 * Before (without this hook)
 * ----------------------------------------------------------------------------
 *
 * ```ts
 * import { toCompilableQuery } from '@powersync/drizzle-driver'
 * import { useQuery } from '@powersync/react-native'
 * import { db } from '@/system/powersync'
 * import { accounts } from '@/data/client/db-schema'
 * import { eq } from 'drizzle-orm'
 *
 * const query = db.query.accounts.findMany({ where: eq(accounts.userId, userId) })
 * const { data, isLoading } = useQuery(toCompilableQuery(query))
 * ```
 *
 * ----------------------------------------------------------------------------
 * After (with this hook)
 * ----------------------------------------------------------------------------
 *
 * ```ts
 * import { useDrizzleQuery } from '@/lib/hooks'
 * import { db } from '@/system/powersync'
 * import { accounts } from '@/data/client/db-schema'
 * import { eq } from 'drizzle-orm'
 *
 * const query = db.query.accounts.findMany({ where: eq(accounts.userId, userId) })
 * const { data, isLoading } = useDrizzleQuery(query)
 * ```
 *
 * ----------------------------------------------------------------------------
 * Alternative: Pass a factory function
 * ----------------------------------------------------------------------------
 *
 * Useful when you prefer to avoid assembling the query inline:
 *
 * ```ts
 * const { data } = useDrizzleQuery((db) =>
 *   db.query.accounts.findMany({ where: eq(accounts.userId, userId) })
 * )
 * ```
 *
 * Differential + factory example:
 *
 * ```ts
 * const { data } = useDrizzleQuery(
 *   (db) => db.query.categories.findMany({ where: eq(categories.userId, userId) }),
 *   {
 *     rowComparator: {
 *       keyBy: (row) => row.id,
 *       compareBy: (row) => JSON.stringify(row)
 *     }
 *   }
 * ) // data: readonly Readonly<RowType>[]
 * ```
 *
 * ----------------------------------------------------------------------------
 * Conditional/deferred execution
 * ----------------------------------------------------------------------------
 *
 * Pass `undefined` when you don't have parameters yet; this avoids compiling and
 * running a real query and instead executes a no-op `SELECT 0 WHERE 0`.
 *
 * ```ts
 * const result = useDrizzleQuery(undefined)
 * // or
 * const result = useDrizzleQuery(condition ? query : undefined)
 * ```
 *
 * ----------------------------------------------------------------------------
 * Differential vs non-differential usage
 * ----------------------------------------------------------------------------
 *
 * - Non-differential (default): Returns a mutable `QueryResult<RowType>` with `RowType[]`.
 *
 * ```ts
 * const { data } = useDrizzleQuery(query) // data: RowType[]
 * ```
 *
 * - Differential (with `rowComparator`): Returns a `ReadonlyQueryResult<RowType>` where
 *   the array and row objects are read-only, and stable references are preserved across
 *   emissions for unchanged rows.
 *
 * ```ts
 * const { data } = useDrizzleQuery(query, {
 *   rowComparator: {
 *     keyBy: (row) => row.id,
 *     compareBy: (row) => JSON.stringify(row)
 *   }
 * }) // data: readonly Readonly<RowType>[]
 * ```
 *
 * ----------------------------------------------------------------------------
 * Why there appear to be multiple "exports"
 * ----------------------------------------------------------------------------
 *
 * You will see this function declared multiple times below. This is a TypeScript
 * overload pattern:
 *
 * - Non-differential with a Drizzle query or `undefined` → returns `QueryResult<RowType>`
 * - Non-differential with a factory `(db) => query` → returns `QueryResult<RowType>`
 * - Differential with a Drizzle query or `undefined` → returns `ReadonlyQueryResult<RowType>`
 * - Differential with a factory `(db) => query` → returns `ReadonlyQueryResult<RowType>`
 * - And then a single implementation that calls `useQuery` exactly once
 *
 * Only the implementation at the bottom is emitted at runtime; the overloads above are
 * type-only and exist to give you precise return types at compile-time.
 */
type DrizzleCompilable<RowType> = {
  execute: () => Promise<RowType | RowType[]>
  toSQL: () => Query
}

type DbInstance = typeof drizzleDb

export function useDrizzleQuery<RowType>(
  query: DrizzleCompilable<RowType> | undefined,
  options?: AdditionalOptions
): QueryResult<RowType>

export function useDrizzleQuery<RowType>(
  factory: (db: DbInstance) => DrizzleCompilable<RowType>,
  options?: AdditionalOptions
): QueryResult<RowType>

export function useDrizzleQuery<RowType>(
  query: DrizzleCompilable<RowType> | undefined,
  options?: DifferentialHookOptions<RowType>
): ReadonlyQueryResult<RowType>

export function useDrizzleQuery<RowType>(
  factory: (db: DbInstance) => DrizzleCompilable<RowType>,
  options?: DifferentialHookOptions<RowType>
): ReadonlyQueryResult<RowType>

export function useDrizzleQuery<RowType>(
  queryOrFactory:
    | DrizzleCompilable<RowType>
    | ((db: DbInstance) => DrizzleCompilable<RowType>)
    | undefined,
  options?: AdditionalOptions | DifferentialHookOptions<RowType>
): QueryResult<RowType> | ReadonlyQueryResult<RowType> {
  const resolvedQuery: DrizzleCompilable<RowType> | undefined =
    typeof queryOrFactory === 'function'
      ? queryOrFactory(drizzleDb)
      : queryOrFactory

  const compiledQuery = resolvedQuery
    ? toCompilableQuery(resolvedQuery)
    : 'SELECT 0 WHERE 0'

  return useQuery<RowType>(compiledQuery, [], options)
}
