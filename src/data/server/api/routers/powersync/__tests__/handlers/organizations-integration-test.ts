import { eq } from 'drizzle-orm'

import { generators, organizations } from '@/data/server/db-schema'

import { handleOrganizations } from '../../handlers/organizations'
import { IDS, seedAssignment } from '../seed-server'
import { setupServerHandlersFixture } from './fixture'

const fixture = setupServerHandlersFixture()

describe('handleOrganizations', () => {
  // SECURITY: adminUserId is always forced to the calling user
  it('insert forces adminUserId to caller', async () => {
    const newId = crypto.randomUUID()
    const result = await handleOrganizations(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        data: { name: 'My Org', admin_user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, newId)
    })
    expect(row!.adminUserId).toBe(IDS.admin)
  })

  it('update succeeds for admin with name', async () => {
    const result = await handleOrganizations(
      fixture.makeCtx({ op: 'update', id: IDS.org, data: { name: 'New Name' } })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(row!.name).toBe('New Name')
  })

  // SECURITY: non-whitelisted fields dropped — only name is updatable
  it('update ignores non-whitelisted fields', async () => {
    const result = await handleOrganizations(
      fixture.makeCtx({
        op: 'update',
        id: IDS.org,
        data: { name: 'X', admin_user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(row!.name).toBe('X')
    expect(row!.adminUserId).toBe(IDS.admin)
  })

  it('rejects update with no whitelisted fields', async () => {
    const result = await handleOrganizations(
      fixture.makeCtx({
        op: 'update',
        id: IDS.org,
        data: { admin_user_id: IDS.outsider }
      })
    )
    expect(result.ok).toBe(false)
    const row = await fixture.testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(row!.adminUserId).toBe(IDS.admin)
  })

  it('rejects non-admin update and leaves the org intact', async () => {
    const result = await handleOrganizations(
      fixture.makeCtx({
        op: 'update',
        id: IDS.org,
        userId: IDS.member,
        data: { name: 'Hacked' }
      })
    )
    expect(result.ok).toBe(false)

    const row = await fixture.testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(row!.name).not.toBe('Hacked')
  })

  // PG CHECK constraint
  it('insert: PG rejects empty name via CHECK constraint', async () => {
    const result = handleOrganizations(
      fixture.makeCtx({
        op: 'insert',
        data: { name: '  ', admin_user_id: IDS.admin }
      })
    )
    await expect(result).rejects.toThrow()
  })

  it('rejects non-admin delete and leaves the org intact', async () => {
    const result = await handleOrganizations(
      fixture.makeCtx({ op: 'delete', id: IDS.org, userId: IDS.member })
    )
    expect(result.ok).toBe(false)

    const row = await fixture.testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(row).toBeDefined()
  })

  it('delete succeeds for admin and cascades', async () => {
    await seedAssignment(fixture.testDb.db)
    const result = await handleOrganizations(
      fixture.makeCtx({ op: 'delete', id: IDS.org })
    )
    expect(result.ok).toBe(true)
    const org = await fixture.testDb.db.query.organizations.findFirst({
      where: eq(organizations.id, IDS.org)
    })
    expect(org).toBeUndefined()
    const gen = await fixture.testDb.db.query.generators.findFirst({
      where: eq(generators.id, IDS.generator)
    })
    expect(gen).toBeUndefined()
  })
})

// ── trigger: validate_org_admin_immutable ──────────────────────────────────
// Directly exercises the trigger by bypassing the handler whitelist. The
// production handler strips admin_user_id from the update path, so handler
// tests alone can never prove the trigger is installed.

describe('trigger: validate_org_admin_immutable', () => {
  it('rejects direct update of admin_user_id', async () => {
    let caught: unknown
    try {
      await fixture.testDb.db
        .update(organizations)
        .set({ adminUserId: IDS.outsider })
        .where(eq(organizations.id, IDS.org))
    } catch (e) {
      caught = e
    }
    expect(caught).toBeDefined()
    const causeMessage = (caught as { cause?: { message?: string } }).cause
      ?.message
    expect(causeMessage).toMatch(/admin_user_id cannot be changed/)
  })
})
