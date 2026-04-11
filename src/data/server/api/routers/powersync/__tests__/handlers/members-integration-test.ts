import { eq } from 'drizzle-orm'

import {
  generatorUserAssignments,
  invitations,
  organizationMembers
} from '@/data/server/db-schema'

import { handleOrganizationMembers } from '../../handlers/members'
import { IDS, seedAssignment, seedInvitation } from '../seed-server'
import { setupServerHandlersFixture } from './fixture'

const fixture = setupServerHandlersFixture()

describe('handleOrganizationMembers', () => {
  it('insert: admin adds member', async () => {
    const newId = crypto.randomUUID()
    const result = await handleOrganizationMembers(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        data: { organization_id: IDS.org, user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, newId)
    })
    expect(row).toBeDefined()
  })

  it('insert: user accepts own invitation', async () => {
    await seedInvitation(fixture.testDb.db, 'outsider@test.com')
    const newId = crypto.randomUUID()
    const result = await handleOrganizationMembers(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        userId: IDS.outsider,
        userEmail: 'outsider@test.com',
        data: { organization_id: IDS.org, user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(true)
    const inv = await fixture.testDb.db.query.invitations.findFirst({
      where: eq(invitations.id, IDS.invitation)
    })
    expect(inv).toBeUndefined()
  })

  it('insert: user accepts but no invitation', async () => {
    const result = await handleOrganizationMembers(
      fixture.makeCtx({
        op: 'insert',
        userId: IDS.outsider,
        userEmail: 'outsider@test.com',
        data: { organization_id: IDS.org, user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(false)
  })

  it('rejects non-admin non-self insert and creates no membership', async () => {
    const newId = crypto.randomUUID()
    const result = await handleOrganizationMembers(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        userId: IDS.member,
        data: { organization_id: IDS.org, user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(false)

    const row = await fixture.testDb.db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, newId)
    })
    expect(row).toBeUndefined()
  })

  it('delete: admin removes member (transfers assignments)', async () => {
    await seedAssignment(fixture.testDb.db, IDS.member)

    const result = await handleOrganizationMembers(
      fixture.makeCtx({ op: 'delete', id: IDS.membership })
    )
    expect(result.ok).toBe(true)

    const member = await fixture.testDb.db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, IDS.membership)
    })
    expect(member).toBeUndefined()

    const adminAssignment =
      await fixture.testDb.db.query.generatorUserAssignments.findFirst({
        where: eq(generatorUserAssignments.userId, IDS.admin)
      })
    expect(adminAssignment).toBeDefined()
  })

  it('delete: admin removes member with no assignments', async () => {
    const result = await handleOrganizationMembers(
      fixture.makeCtx({ op: 'delete', id: IDS.membership })
    )
    expect(result.ok).toBe(true)
    const member = await fixture.testDb.db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, IDS.membership)
    })
    expect(member).toBeUndefined()
  })

  it('delete: member leaves on own (transfers assignments to org admin)', async () => {
    await seedAssignment(fixture.testDb.db, IDS.member)

    const result = await handleOrganizationMembers(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.membership,
        userId: IDS.member,
        userEmail: 'member@test.com'
      })
    )
    expect(result.ok).toBe(true)

    const adminAssignment =
      await fixture.testDb.db.query.generatorUserAssignments.findFirst({
        where: eq(generatorUserAssignments.userId, IDS.admin)
      })
    expect(adminAssignment).toBeDefined()
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleOrganizationMembers(
      fixture.makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  it('rejects outsider delete and leaves the membership intact', async () => {
    const result = await handleOrganizationMembers(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.membership,
        userId: IDS.outsider
      })
    )
    expect(result.ok).toBe(false)

    const row = await fixture.testDb.db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.id, IDS.membership)
    })
    expect(row).toBeDefined()
  })

  it('invalid op (update) denied', async () => {
    const result = await handleOrganizationMembers(
      fixture.makeCtx({ op: 'update' })
    )
    expect(result.ok).toBe(false)
  })
})
