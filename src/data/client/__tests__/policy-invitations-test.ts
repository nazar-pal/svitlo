import type Database from 'better-sqlite3'
import type { drizzle } from 'drizzle-orm/better-sqlite3'
import { renderHook, waitFor } from '@testing-library/react-native'

import {
  IDS,
  seedBaseScenario,
  seedInvitation
} from '@/data/client/mutations/__tests__/seed'
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
const invitationsD = require('@/data/shared/invitations/decisions')

const INVITEE_EMAIL = 'invitee@test.com'

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

describe('usePolicy(invitations.createInvitation)', () => {
  it('reports loading when args are null', () => {
    const { result } = renderHook(() =>
      usePolicy(policies.invitations.createInvitation, null)
    )
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with ONLY_ADMIN_CAN_INVITE for a non-admin caller', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.invitations.createInvitation, {
        callerUserId: IDS.memberUser,
        organizationId: IDS.org,
        inviteeEmail: ''
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'ONLY_ADMIN_CAN_INVITE'
      })
    })
  })

  it('accepts the admin when no email is provided (affordance gating)', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.invitations.createInvitation, {
        callerUserId: IDS.adminUser,
        organizationId: IDS.org,
        inviteeEmail: ''
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })

  it('rejects with INVITATION_ALREADY_SENT when one exists for the email', async () => {
    seedBaseScenario(mockDb)
    seedInvitation(mockDb, INVITEE_EMAIL)
    const { result } = renderHook(() =>
      usePolicy(policies.invitations.createInvitation, {
        callerUserId: IDS.adminUser,
        organizationId: IDS.org,
        inviteeEmail: INVITEE_EMAIL
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'INVITATION_ALREADY_SENT'
      })
    })
  })

  it('rejects with INVITATION_ALREADY_SENT when caller email is mixed-case', async () => {
    seedBaseScenario(mockDb)
    seedInvitation(mockDb, INVITEE_EMAIL)
    const { result } = renderHook(() =>
      usePolicy(policies.invitations.createInvitation, {
        callerUserId: IDS.adminUser,
        organizationId: IDS.org,
        inviteeEmail: '  INVITEE@Test.COM  '
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'INVITATION_ALREADY_SENT'
      })
    })
  })
})

describe('usePolicy(invitations.cancelInvitation)', () => {
  it('reports loading when args are null', () => {
    const { result } = renderHook(() =>
      usePolicy(policies.invitations.cancelInvitation, null)
    )
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with INVITATION_NOT_FOUND when the row is missing', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.invitations.cancelInvitation, {
        callerUserId: IDS.adminUser,
        invitationId: 'does-not-exist'
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'INVITATION_NOT_FOUND'
      })
    })
  })

  it('rejects with ONLY_ADMIN_CAN_CANCEL_INVITATIONS for a non-admin caller', async () => {
    seedBaseScenario(mockDb)
    seedInvitation(mockDb, INVITEE_EMAIL)
    const { result } = renderHook(() =>
      usePolicy(policies.invitations.cancelInvitation, {
        callerUserId: IDS.memberUser,
        invitationId: IDS.invitation
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'ONLY_ADMIN_CAN_CANCEL_INVITATIONS'
      })
    })
  })

  it('accepts the happy path for the admin', async () => {
    seedBaseScenario(mockDb)
    seedInvitation(mockDb, INVITEE_EMAIL)
    const { result } = renderHook(() =>
      usePolicy(policies.invitations.cancelInvitation, {
        callerUserId: IDS.adminUser,
        invitationId: IDS.invitation
      })
    )
    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

describe('parity with async invitations decisions', () => {
  it('createInvitation: hook matches async for happy path', async () => {
    seedBaseScenario(mockDb)
    const { result } = renderHook(() =>
      usePolicy(policies.invitations.createInvitation, {
        callerUserId: IDS.adminUser,
        organizationId: IDS.org,
        inviteeEmail: 'new-guest@test.com'
      })
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    const check = await runDecisionAsync(
      invitationsD.createInvitation,
      {
        callerUserId: IDS.adminUser,
        organizationId: IDS.org,
        inviteeEmail: 'new-guest@test.com'
      },
      clientLookup(mockDb)
    )
    expect(result.current).toEqual(stripFacts(check))
  })

  it('cancelInvitation: hook matches async for non-admin caller', async () => {
    seedBaseScenario(mockDb)
    seedInvitation(mockDb, INVITEE_EMAIL)
    const { result } = renderHook(() =>
      usePolicy(policies.invitations.cancelInvitation, {
        callerUserId: IDS.memberUser,
        invitationId: IDS.invitation
      })
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })
    const check = await runDecisionAsync(
      invitationsD.cancelInvitation,
      { callerUserId: IDS.memberUser, invitationId: IDS.invitation },
      clientLookup(mockDb)
    )
    expect(result.current).toEqual(stripFacts(check))
  })
})
