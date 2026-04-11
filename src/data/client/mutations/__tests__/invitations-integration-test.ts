import { eq } from 'drizzle-orm'

import {
  invitations,
  organizationMembers
} from '@/data/client/db-schema/organizations'

import { setupMutationHarness } from './harness'
import { IDS, seedBaseScenario, seedInvitation } from './seed'

const h = setupMutationHarness()

import {
  acceptInvitation,
  cancelInvitation,
  createInvitation,
  declineInvitation
} from '../invitations'

beforeEach(() => {
  seedBaseScenario(h.db)
})

// ── createInvitation ────────────────────────────────────────────────────────

describe('createInvitation', () => {
  it('admin creates an invitation', async () => {
    const result = await createInvitation(IDS.adminUser, {
      organizationId: IDS.org,
      inviteeEmail: 'new@test.com'
    })
    expect(result.ok).toBe(true)

    const rows = h.db
      .select()
      .from(invitations)
      .where(eq(invitations.inviteeEmail, 'new@test.com'))
      .all()
    expect(rows).toHaveLength(1)
  })

  it('fails with duplicate invitation', async () => {
    seedInvitation(h.db, 'dup@test.com')
    const result = await createInvitation(IDS.adminUser, {
      organizationId: IDS.org,
      inviteeEmail: 'dup@test.com'
    })
    expect(result.ok).toBe(false)
  })

  it('fails with invalid email', async () => {
    const result = await createInvitation(IDS.adminUser, {
      organizationId: IDS.org,
      inviteeEmail: 'not-an-email'
    })
    expect(result.ok).toBe(false)
  })

  it('rejects non-admin and creates no invitation', async () => {
    const result = await createInvitation(IDS.memberUser, {
      organizationId: IDS.org,
      inviteeEmail: 'nope@test.com'
    })
    expect(result.ok).toBe(false)

    const rows = h.db
      .select()
      .from(invitations)
      .where(eq(invitations.organizationId, IDS.org))
      .all()
    expect(rows).toHaveLength(0)
  })
})

// ── acceptInvitation ────────────────────────────────────────────────────────

describe('acceptInvitation', () => {
  it('accepts invitation, adds member, deletes invitation', async () => {
    seedInvitation(h.db, 'outsider@test.com')
    const result = await acceptInvitation(
      IDS.outsiderUser,
      'outsider@test.com',
      IDS.invitation
    )
    expect(result.ok).toBe(true)

    // Membership created
    const [member] = h.db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, IDS.outsiderUser))
      .all()
    expect(member).toBeDefined()

    // Invitation deleted
    const [inv] = h.db
      .select()
      .from(invitations)
      .where(eq(invitations.id, IDS.invitation))
      .all()
    expect(inv).toBeUndefined()
  })

  it('accepts with case-insensitive email matching', async () => {
    seedInvitation(h.db, 'Outsider@Test.COM')
    const result = await acceptInvitation(
      IDS.outsiderUser,
      'outsider@test.com',
      IDS.invitation
    )
    expect(result.ok).toBe(true)
  })

  it('fails when invitation does not exist', async () => {
    const result = await acceptInvitation(
      IDS.outsiderUser,
      'outsider@test.com',
      'nonexistent'
    )
    expect(result.ok).toBe(false)
  })

  it('fails when email does not match', async () => {
    seedInvitation(h.db, 'someone@test.com')
    const result = await acceptInvitation(
      IDS.outsiderUser,
      'wrong@test.com',
      IDS.invitation
    )
    expect(result.ok).toBe(false)
  })

  it('fails when user is already a member', async () => {
    seedInvitation(h.db, 'member@test.com')
    const result = await acceptInvitation(
      IDS.memberUser,
      'member@test.com',
      IDS.invitation
    )
    expect(result.ok).toBe(false)
  })
})

// ── declineInvitation ──────────────────────────────────────────────────────

describe('declineInvitation', () => {
  it('declines invitation, invitation deleted', async () => {
    seedInvitation(h.db, 'outsider@test.com')
    const result = await declineInvitation('outsider@test.com', IDS.invitation)
    expect(result.ok).toBe(true)

    const [inv] = h.db
      .select()
      .from(invitations)
      .where(eq(invitations.id, IDS.invitation))
      .all()
    expect(inv).toBeUndefined()
  })

  it('fails when invitation does not exist', async () => {
    const result = await declineInvitation('outsider@test.com', 'nonexistent')
    expect(result.ok).toBe(false)
  })

  it('fails when email does not match', async () => {
    seedInvitation(h.db, 'someone@test.com')
    const result = await declineInvitation('wrong@test.com', IDS.invitation)
    expect(result.ok).toBe(false)
  })
})

// ── cancelInvitation ────────────────────────────────────────────────────────

describe('cancelInvitation', () => {
  it('admin cancels invitation', async () => {
    seedInvitation(h.db)
    const result = await cancelInvitation(IDS.adminUser, IDS.invitation)
    expect(result.ok).toBe(true)

    const [inv] = h.db
      .select()
      .from(invitations)
      .where(eq(invitations.id, IDS.invitation))
      .all()
    expect(inv).toBeUndefined()
  })

  it('fails when invitation does not exist', async () => {
    const result = await cancelInvitation(IDS.adminUser, 'nonexistent')
    expect(result.ok).toBe(false)
  })

  it('rejects non-admin and leaves the invitation intact', async () => {
    seedInvitation(h.db)
    const result = await cancelInvitation(IDS.memberUser, IDS.invitation)
    expect(result.ok).toBe(false)

    const [inv] = h.db
      .select()
      .from(invitations)
      .where(eq(invitations.id, IDS.invitation))
      .all()
    expect(inv).toBeDefined()
  })
})
