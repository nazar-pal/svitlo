import { eq } from 'drizzle-orm'

import { invitations } from '@/data/server/db-schema'

import { handleInvitations } from '../../handlers/invitations'
import { IDS, seedInvitation } from '../seed-server'
import { setupServerHandlersFixture } from './fixture'

const fixture = setupServerHandlersFixture()

describe('handleInvitations', () => {
  it('insert: admin creates invitation', async () => {
    const newId = crypto.randomUUID()
    const result = await handleInvitations(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        data: {
          organization_id: IDS.org,
          invitee_email: 'new@test.com',
          invited_by_user_id: IDS.admin
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.invitations.findFirst({
      where: eq(invitations.id, newId)
    })
    expect(row).toBeDefined()
    expect(row!.inviteeEmail).toBe('new@test.com')
    expect(row!.inviteeUserId).toBeNull()
  })

  it('insert: resolves inviteeUserId when invitee already has an account', async () => {
    const newId = crypto.randomUUID()
    const result = await handleInvitations(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        data: {
          organization_id: IDS.org,
          invitee_email: 'OUTSIDER@test.com',
          invited_by_user_id: IDS.admin
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.invitations.findFirst({
      where: eq(invitations.id, newId)
    })
    expect(row!.inviteeUserId).toBe(IDS.outsider)
  })

  it('insert: non-admin denied', async () => {
    const result = await handleInvitations(
      fixture.makeCtx({
        op: 'insert',
        userId: IDS.member,
        data: {
          organization_id: IDS.org,
          invitee_email: 'x@test.com',
          invited_by_user_id: IDS.member
        }
      })
    )
    expect(result.ok).toBe(false)
  })

  it('delete: admin cancels', async () => {
    await seedInvitation(fixture.testDb.db)
    const result = await handleInvitations(
      fixture.makeCtx({ op: 'delete', id: IDS.invitation })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.invitations.findFirst({
      where: eq(invitations.id, IDS.invitation)
    })
    expect(row).toBeUndefined()
  })

  // SECURITY: case-insensitive email comparison
  it('delete: invitee declines (case-insensitive email)', async () => {
    await seedInvitation(fixture.testDb.db, 'Test@Example.com')
    const result = await handleInvitations(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.invitation,
        userId: IDS.outsider,
        userEmail: 'test@example.com'
      })
    )
    expect(result.ok).toBe(true)
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleInvitations(
      fixture.makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  it('insert: duplicate invitation for same org+email is idempotent (onConflictDoNothing)', async () => {
    await seedInvitation(fixture.testDb.db)
    const duplicateId = crypto.randomUUID()
    const result = await handleInvitations(
      fixture.makeCtx({
        op: 'insert',
        id: duplicateId,
        data: {
          organization_id: IDS.org,
          invitee_email: 'invitee@test.com',
          invited_by_user_id: IDS.admin
        }
      })
    )
    expect(result.ok).toBe(true)
    const rows = await fixture.testDb.db
      .select()
      .from(invitations)
      .where(eq(invitations.organizationId, IDS.org))
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(IDS.invitation)
  })

  it('delete: unauthorized (neither admin nor invitee)', async () => {
    await seedInvitation(fixture.testDb.db, 'someone@test.com')
    const result = await handleInvitations(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.invitation,
        userId: IDS.outsider,
        userEmail: 'wrong@test.com'
      })
    )
    expect(result.ok).toBe(false)
  })

  it('invalid op (update) denied', async () => {
    const result = await handleInvitations(fixture.makeCtx({ op: 'update' }))
    expect(result.ok).toBe(false)
  })

  // PG CHECK constraint
  it('insert: PG rejects empty invitee email via CHECK constraint', async () => {
    const result = handleInvitations(
      fixture.makeCtx({
        op: 'insert',
        data: {
          organization_id: IDS.org,
          invitee_email: '  ',
          invited_by_user_id: IDS.admin
        }
      })
    )
    await expect(result).rejects.toThrow()
  })
})
