import type Database from 'better-sqlite3'
import type { drizzle } from 'drizzle-orm/better-sqlite3'
import { renderHook, waitFor } from '@testing-library/react-native'

import { IDS, seedBaseScenario } from '@/data/client/mutations/__tests__/seed'
import {
  closeDatabase,
  createTestDatabase,
  resetDatabase
} from '@/data/client/mutations/__tests__/test-db'
import { stripFacts } from './strip-facts'

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

const { policies, usePolicy } = require('@/data/client/use-policy')
const { clientLookup } = require('@/data/client/registry')
const { runDecisionAsync } = require('@/data/shared/facts/async-adapter')
const membersD = require('@/data/shared/members/decisions')

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

describe('usePolicy(members.removeMember)', () => {
  it('reports loading when args are null', () => {
    const { result } = renderHook(() =>
      usePolicy(policies.members.removeMember, null)
    )
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with MEMBER_NOT_FOUND when the row is missing', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.members.removeMember, {
        callerUserId: IDS.adminUser,
        memberId: 'does-not-exist'
      })
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
      usePolicy(policies.members.removeMember, {
        callerUserId: IDS.outsiderUser,
        memberId: IDS.membership
      })
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
      usePolicy(policies.members.removeMember, {
        callerUserId: IDS.adminUser,
        memberId: IDS.membership
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

// Parity: reactive `PolicyView` is the `ok/code` projection of the async
// `CheckResult<Facts>`. Strip facts before comparing — `removeMember`
// carries `member` + `authzOrg` on success, which the reactive view
// deliberately drops.
describe('parity with async members decisions', () => {
  it('removeMember: hook matches async for MEMBER_NOT_FOUND', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.members.removeMember, {
        callerUserId: IDS.adminUser,
        memberId: 'does-not-exist'
      })
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    const check = await runDecisionAsync(
      membersD.removeMember,
      { callerUserId: IDS.adminUser, memberId: 'does-not-exist' },
      clientLookup(mockDb)
    )
    expect(result.current).toEqual(stripFacts(check))
  })

  it('removeMember: hook matches async for happy path (projected)', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.members.removeMember, {
        callerUserId: IDS.adminUser,
        memberId: IDS.membership
      })
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    const check = await runDecisionAsync(
      membersD.removeMember,
      { callerUserId: IDS.adminUser, memberId: IDS.membership },
      clientLookup(mockDb)
    )
    expect(check.ok).toBe(true)
    expect(result.current).toEqual({ status: 'ready', ok: true })
  })
})
