import { eq } from 'drizzle-orm'

import { invitations } from '@/data/server/db-schema'

import { backfillPendingInvitationsForUser } from '../backfill'
import { setupServerHandlersFixture } from '../../api/routers/powersync/__tests__/handlers/fixture'
import {
  IDS,
  seedInvitation
} from '../../api/routers/powersync/__tests__/seed-server'

const fixture = setupServerHandlersFixture()

describe('backfillPendingInvitationsForUser', () => {
  it('fills inviteeUserId for pending invitations matching the new user email', async () => {
    await seedInvitation(fixture.testDb.db, 'outsider@test.com')

    await backfillPendingInvitationsForUser(fixture.testDb.db, {
      id: IDS.outsider,
      email: 'outsider@test.com'
    })

    const row = await fixture.testDb.db.query.invitations.findFirst({
      where: eq(invitations.id, IDS.invitation)
    })
    expect(row!.inviteeUserId).toBe(IDS.outsider)
  })

  it('matches case-insensitively on invitee email', async () => {
    await seedInvitation(fixture.testDb.db, 'Outsider@Test.COM')

    await backfillPendingInvitationsForUser(fixture.testDb.db, {
      id: IDS.outsider,
      email: 'outsider@test.com'
    })

    const row = await fixture.testDb.db.query.invitations.findFirst({
      where: eq(invitations.id, IDS.invitation)
    })
    expect(row!.inviteeUserId).toBe(IDS.outsider)
  })

  it('does not overwrite an already-resolved inviteeUserId', async () => {
    await fixture.testDb.db.insert(invitations).values({
      id: IDS.invitation,
      organizationId: IDS.org,
      inviteeEmail: 'already@test.com',
      inviteeUserId: IDS.outsider,
      invitedByUserId: IDS.admin,
      createdAt: new Date()
    })

    await backfillPendingInvitationsForUser(fixture.testDb.db, {
      id: 'someone-else',
      email: 'already@test.com'
    })

    const row = await fixture.testDb.db.query.invitations.findFirst({
      where: eq(invitations.id, IDS.invitation)
    })
    expect(row!.inviteeUserId).toBe(IDS.outsider)
  })

  it('leaves non-matching invitations untouched', async () => {
    await seedInvitation(fixture.testDb.db, 'other@test.com')

    await backfillPendingInvitationsForUser(fixture.testDb.db, {
      id: IDS.outsider,
      email: 'nomatch@test.com'
    })

    const row = await fixture.testDb.db.query.invitations.findFirst({
      where: eq(invitations.id, IDS.invitation)
    })
    expect(row!.inviteeUserId).toBeNull()
  })
})
