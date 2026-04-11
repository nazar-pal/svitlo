import { eq } from 'drizzle-orm'

import { user as userTable } from '@/data/server/db-schema'

import { handleUser } from '../../handlers/user'
import { IDS } from '../seed-server'
import { setupServerHandlersFixture } from './fixture'

const fixture = setupServerHandlersFixture()

describe('handleUser', () => {
  it('rejects insert', async () => {
    const result = await handleUser(fixture.makeCtx({ op: 'insert' }))
    expect(result.ok).toBe(false)
  })

  it('rejects delete', async () => {
    const result = await handleUser(fixture.makeCtx({ op: 'delete' }))
    expect(result.ok).toBe(false)
  })

  it('rejects updating another user', async () => {
    const result = await handleUser(
      fixture.makeCtx({ op: 'update', id: IDS.member, userId: IDS.admin })
    )
    expect(result.ok).toBe(false)
  })

  it('updates own name', async () => {
    const result = await handleUser(
      fixture.makeCtx({
        op: 'update',
        id: IDS.admin,
        data: { name: 'New Name' }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.user.findFirst({
      where: eq(userTable.id, IDS.admin)
    })
    expect(row!.name).toBe('New Name')
  })

  it('updates own image (string)', async () => {
    const result = await handleUser(
      fixture.makeCtx({
        op: 'update',
        id: IDS.admin,
        data: { image: 'https://img.url' }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.user.findFirst({
      where: eq(userTable.id, IDS.admin)
    })
    expect(row!.image).toBe('https://img.url')
  })

  it('updates own image (null)', async () => {
    await handleUser(
      fixture.makeCtx({
        op: 'update',
        id: IDS.admin,
        data: { image: 'https://img.url' }
      })
    )
    const result = await handleUser(
      fixture.makeCtx({ op: 'update', id: IDS.admin, data: { image: null } })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.user.findFirst({
      where: eq(userTable.id, IDS.admin)
    })
    expect(row!.image).toBeNull()
  })

  // SECURITY: non-whitelisted fields are silently dropped
  it('ignores non-whitelisted fields', async () => {
    const result = await handleUser(
      fixture.makeCtx({
        op: 'update',
        id: IDS.admin,
        data: { name: 'X', email: 'hack@evil.com', emailVerified: true }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.user.findFirst({
      where: eq(userTable.id, IDS.admin)
    })
    expect(row!.name).toBe('X')
    expect(row!.email).toBe('admin@test.com')
  })

  it('no-ops when no whitelisted fields present', async () => {
    const result = await handleUser(
      fixture.makeCtx({
        op: 'update',
        id: IDS.admin,
        data: { email: 'hack@evil.com' }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.user.findFirst({
      where: eq(userTable.id, IDS.admin)
    })
    expect(row!.email).toBe('admin@test.com')
  })
})
