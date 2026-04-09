/**
 * Shared mock for @powersync/react-native's useQuery hook.
 *
 * Instead of returning stub data, this mock EXECUTES real Drizzle queries
 * against the in-memory SQLite test database. This means useDrizzleQuery
 * works end-to-end: query builder -> toCompilableQuery -> useQuery -> execute.
 *
 * Usage in test files:
 *   jest.mock('@powersync/react-native', () =>
 *     require('@/lib/hooks/__tests__/mock-use-query').createUseQueryMock()
 *   )
 */
export function createUseQueryMock() {
  return {
    useQuery: (query: unknown) => {
      const React = require('react')
      const { act } = require('@testing-library/react-native')
      const [data, setData] = React.useState([])

      // Stable identity for a drizzle query so rerenders with a changed query
      // re-execute, mirroring production useQuery (which detects SQL changes
      // internally). Falls back to referential equality for non-drizzle shapes
      // (e.g. raw strings from error-path tests).
      const key = queryKey(query)

      React.useEffect(() => {
        if (typeof query === 'string') {
          setData([])
          return
        }
        const q = query as { execute: () => Promise<unknown[]> }
        let active = true
        q.execute().then((rows: unknown[]) => {
          act(() => {
            if (active) setData(rows)
          })
        })
        return () => {
          active = false
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures query identity; `query` itself is intentionally excluded
      }, [key])

      return { data, isLoading: false, error: undefined, isFetching: false }
    }
  }
}

function queryKey(query: unknown): string | unknown {
  if (!query || typeof query !== 'object') return query

  // PowerSync's `toCompilableQuery` wrapper (used by useDrizzleQuery) exposes
  // `.compile()` returning `{ sql, parameters }`.
  if (
    'compile' in query &&
    typeof (query as { compile?: unknown }).compile === 'function'
  ) {
    const { sql, parameters } = (
      query as { compile: () => { sql: string; parameters: unknown[] } }
    ).compile()
    return `${sql}::${JSON.stringify(parameters)}`
  }

  // Raw drizzle query builder exposes `.toSQL()` returning `{ sql, params }`.
  if (
    'toSQL' in query &&
    typeof (query as { toSQL?: unknown }).toSQL === 'function'
  ) {
    const { sql, params } = (
      query as { toSQL: () => { sql: string; params: unknown[] } }
    ).toSQL()
    return `${sql}::${JSON.stringify(params)}`
  }

  return query
}
