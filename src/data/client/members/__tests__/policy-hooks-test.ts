import type Database from 'better-sqlite3'
import type { drizzle } from 'drizzle-orm/better-sqlite3'
import { renderHook, waitFor } from '@testing-library/react-native'

import { IDS, seedBaseScenario } from '@/data/client/mutations/__tests__/seed'
import {
  closeDatabase,
  createTestDatabase,
  resetDatabase
} from '@/data/client/mutations/__tests__/test-db'

let mockDb: ReturnType<typeof drizzle>
let mockSqlite: Database.Database

jest.mock('@powersync/react-native', () =>
  require('@/lib/hooks/__tests__/mock-use-query').createUseQueryMock()
)

jest.mock('@/lib/powersync/database', () => ({
  get db() {
    return mockDb
  }
}))

jest.mock('@/lib/powersync', () => ({}))

const { useCanRemoveMember } = require('../policy-hooks')

const {
  createClientMemberFactsProvider
} = require('@/data/client/facts-providers')
const { createClientAuthzProvider } = require('@/data/client/authz/provider')
const { createAuthzChecks } = require('@/data/shared/authz')
const { createMemberLifecycleChecks } = require('@/data/shared/members')

function buildChecks() {
  const authz = createAuthzChecks(createClientAuthzProvider(mockDb))
  return createMemberLifecycleChecks(
    createClientMemberFactsProvider(mockDb),
    authz
  )
}

beforeAll(async () => {
  const testDb = await createTestDatabase()
  mockDb = testDb.db
  mockSqlite = testDb.sqlite
})

beforeEach(() => {
  jest.resetAllMocks()
  resetDatabase(mockSqlite)
})

afterAll(() => {
  closeDatabase(mockSqlite)
})

// ── useCanRemoveMember ──────────────────────────────────────────────────────

describe('useCanRemoveMember', () => {
  it('reports loading when inputs are missing', () => {
    const { result } = renderHook(() => useCanRemoveMember(null, null))
    expect(result.current).toEqual({ status: 'loading' })
  })

  // Regression lock: `removeMemberPolicy` short-circuits on `!member` before
  // the authz lookup. The hook must match; otherwise it would wait on an
  // authz subscription that gets a null orgId and stays loading forever.
  it('rejects with MEMBER_NOT_FOUND when the row is missing', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanRemoveMember(IDS.adminUser, 'does-not-exist')
    )

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'MEMBER_NOT_FOUND'
      })
    })
  })

  it('rejects with ONLY_ADMIN_CAN_REMOVE_MEMBERS for a non-admin caller', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanRemoveMember(IDS.outsiderUser, IDS.membership)
    )

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'ONLY_ADMIN_CAN_REMOVE_MEMBERS'
      })
    })
  })

  it('accepts the happy path for the admin', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanRemoveMember(IDS.adminUser, IDS.membership)
    )

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

// ── Parity: hook vs async MemberLifecycleChecks ─────────────────────────────
// Guardrail against drift between the reactive SQL-to-facts mapping and the
// async FactsProvider that the mutation path uses.

describe('parity with MemberLifecycleChecks', () => {
  it('removeMember: hook matches check for MEMBER_NOT_FOUND', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanRemoveMember(IDS.adminUser, 'does-not-exist')
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const check = await buildChecks().removeMember(
      IDS.adminUser,
      'does-not-exist'
    )

    expect(result.current).toEqual({ status: 'ready', ...check })
  })

  it('removeMember: hook matches check for non-admin caller', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanRemoveMember(IDS.outsiderUser, IDS.membership)
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const check = await buildChecks().removeMember(
      IDS.outsiderUser,
      IDS.membership
    )

    expect(result.current).toEqual({ status: 'ready', ...check })
  })

  // The async check carries `member` + `adminUserId` on success so the
  // mutation can drive the transfer-and-delete side effect. The hook
  // projects that away (`PolicyView` is narrower), so compare the ok bit
  // directly on this branch instead of spreading the full check result.
  it('removeMember: hook matches check for happy path (projected)', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanRemoveMember(IDS.adminUser, IDS.membership)
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const check = await buildChecks().removeMember(
      IDS.adminUser,
      IDS.membership
    )

    expect(check.ok).toBe(true)
    expect(result.current).toEqual({ status: 'ready', ok: true })
  })
})
