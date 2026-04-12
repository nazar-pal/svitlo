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

const {
  useCanCreateInvitation,
  useCanCancelInvitation
} = require('../policy-hooks')

const {
  createClientInvitationFactsProvider
} = require('@/data/client/invitations/provider')
const { createClientAuthzProvider } = require('@/data/client/authz/provider')
const { createAuthzChecks } = require('@/data/shared/authz')
const { createInvitationLifecycleChecks } = require('@/data/shared/invitations')

const INVITEE_EMAIL = 'invitee@test.com'

function buildChecks() {
  const authz = createAuthzChecks(createClientAuthzProvider(mockDb))
  return createInvitationLifecycleChecks(
    createClientInvitationFactsProvider(mockDb),
    authz
  )
}

beforeAll(async () => {
  const testDb = await createTestDatabase()
  mockDb = testDb.db
  mockSqlite = testDb.sqlite
})

beforeEach(() => {
  resetDatabase(mockSqlite)
})

afterAll(() => {
  closeDatabase(mockSqlite)
})

// ── useCanCreateInvitation ──────────────────────────────────────────────────

describe('useCanCreateInvitation', () => {
  it('reports loading when inputs are missing', () => {
    const { result } = renderHook(() => useCanCreateInvitation(null, null))
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with ONLY_ADMIN_CAN_INVITE for a non-admin caller', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanCreateInvitation(IDS.memberUser, IDS.org)
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
      useCanCreateInvitation(IDS.adminUser, IDS.org)
    )

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })

  it('rejects with INVITATION_ALREADY_SENT when one exists for the email', async () => {
    seedBaseScenario(mockDb)
    seedInvitation(mockDb, INVITEE_EMAIL)

    const { result } = renderHook(() =>
      useCanCreateInvitation(IDS.adminUser, IDS.org, INVITEE_EMAIL)
    )

    await waitFor(() => {
      expect(result.current).toEqual({
        status: 'ready',
        ok: false,
        code: 'INVITATION_ALREADY_SENT'
      })
    })
  })

  it('accepts the admin with a never-invited email', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanCreateInvitation(IDS.adminUser, IDS.org, 'new-guest@test.com')
    )

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })

  // Regression: case-insensitive email comparison must hold without caller
  // pre-normalisation. The policy invariant is documented in
  // `src/data/shared/invitations/policy.ts:3-5`.
  it('rejects with INVITATION_ALREADY_SENT when caller email is mixed-case', async () => {
    seedBaseScenario(mockDb)
    seedInvitation(mockDb, INVITEE_EMAIL)

    const { result } = renderHook(() =>
      useCanCreateInvitation(IDS.adminUser, IDS.org, '  INVITEE@Test.COM  ')
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

// ── useCanCancelInvitation ──────────────────────────────────────────────────

describe('useCanCancelInvitation', () => {
  it('reports loading when inputs are missing', () => {
    const { result } = renderHook(() => useCanCancelInvitation(null, null))
    expect(result.current).toEqual({ status: 'loading' })
  })

  it('rejects with INVITATION_NOT_FOUND when the row is missing', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanCancelInvitation(IDS.adminUser, 'does-not-exist')
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
      useCanCancelInvitation(IDS.memberUser, IDS.invitation)
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
      useCanCancelInvitation(IDS.adminUser, IDS.invitation)
    )

    await waitFor(() => {
      expect(result.current).toEqual({ status: 'ready', ok: true })
    })
  })
})

// ── Parity: hook vs async InvitationLifecycleChecks ─────────────────────────
// Guardrail against drift between the reactive SQL-to-facts mapping and the
// async FactsProvider that the mutation path uses.

describe('parity with InvitationLifecycleChecks', () => {
  it('createInvitation: hook matches check for non-admin', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanCreateInvitation(IDS.memberUser, IDS.org, 'new-guest@test.com')
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const check = await buildChecks().createInvitation(
      IDS.memberUser,
      IDS.org,
      'new-guest@test.com'
    )

    expect(result.current).toEqual({ status: 'ready', ...check })
  })

  it('createInvitation: hook matches check for already-invited', async () => {
    seedBaseScenario(mockDb)
    seedInvitation(mockDb, INVITEE_EMAIL)

    const { result } = renderHook(() =>
      useCanCreateInvitation(IDS.adminUser, IDS.org, INVITEE_EMAIL)
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const check = await buildChecks().createInvitation(
      IDS.adminUser,
      IDS.org,
      INVITEE_EMAIL
    )

    expect(result.current).toEqual({ status: 'ready', ...check })
  })

  it('createInvitation: hook matches check for happy path', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanCreateInvitation(IDS.adminUser, IDS.org, 'new-guest@test.com')
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const check = await buildChecks().createInvitation(
      IDS.adminUser,
      IDS.org,
      'new-guest@test.com'
    )

    expect(result.current).toEqual({ status: 'ready', ...check })
  })

  it('cancelInvitation: hook matches check for missing row', async () => {
    seedBaseScenario(mockDb)

    const { result } = renderHook(() =>
      useCanCancelInvitation(IDS.adminUser, 'does-not-exist')
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const check = await buildChecks().cancelInvitation(
      IDS.adminUser,
      'does-not-exist'
    )

    expect(result.current).toEqual({ status: 'ready', ...check })
  })

  it('cancelInvitation: hook matches check for non-admin caller', async () => {
    seedBaseScenario(mockDb)
    seedInvitation(mockDb, INVITEE_EMAIL)

    const { result } = renderHook(() =>
      useCanCancelInvitation(IDS.memberUser, IDS.invitation)
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const check = await buildChecks().cancelInvitation(
      IDS.memberUser,
      IDS.invitation
    )

    expect(result.current).toEqual({ status: 'ready', ...check })
  })

  it('cancelInvitation: hook matches check for happy path', async () => {
    seedBaseScenario(mockDb)
    seedInvitation(mockDb, INVITEE_EMAIL)

    const { result } = renderHook(() =>
      useCanCancelInvitation(IDS.adminUser, IDS.invitation)
    )
    await waitFor(() => {
      expect(result.current.status).toBe('ready')
    })

    const check = await buildChecks().cancelInvitation(
      IDS.adminUser,
      IDS.invitation
    )

    expect(result.current).toEqual({ status: 'ready', ...check })
  })
})
