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
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mock runs once per renderHook; real useQuery uses SQL string comparison internally
      }, [])

      return { data, isLoading: false, error: undefined, isFetching: false }
    }
  }
}
