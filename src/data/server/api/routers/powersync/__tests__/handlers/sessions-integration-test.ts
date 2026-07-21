import { eq } from 'drizzle-orm'

import { generatorSessions } from '@/data/server/db-schema'

import { handleGeneratorSessions } from '../../handlers/sessions'
import { IDS, seedAssignment, seedSession } from '../seed-server'
import { setupServerHandlersFixture } from './fixture'

const fixture = setupServerHandlersFixture()

describe('handleGeneratorSessions', () => {
  // SECURITY: startedByUserId forced to caller
  it('insert: forces startedByUserId to caller', async () => {
    const newId = crypto.randomUUID()
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        data: {
          generator_id: IDS.generator,
          started_by_user_id: IDS.outsider
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, newId)
    })
    expect(row!.startedByUserId).toBe(IDS.admin)
  })

  it('insert: user with access via assignment', async () => {
    await seedAssignment(fixture.testDb.db)
    const newId = crypto.randomUUID()
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        userId: IDS.member,
        data: { generator_id: IDS.generator }
      })
    )
    expect(result.ok).toBe(true)
  })

  it('rejects outsider insert and creates no session', async () => {
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'insert',
        userId: IDS.outsider,
        data: { generator_id: IDS.generator }
      })
    )
    expect(result.ok).toBe(false)

    const rows = await fixture.testDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.generatorId, IDS.generator))
    expect(rows).toHaveLength(0)
  })

  it('update: session found, has access', async () => {
    await seedSession(fixture.testDb.db)
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        data: {
          stopped_at: '2026-01-15T14:00:00Z',
          stopped_by_user_id: IDS.admin
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.stoppedAt).toBeInstanceOf(Date)
  })

  it('update: session not found', async () => {
    const result = await handleGeneratorSessions(
      fixture.makeCtx({ op: 'update', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(false)
  })

  // SECURITY: stoppedByUserId is always forced to the calling user
  it('update: enforces stoppedByUserId to caller', async () => {
    await seedSession(fixture.testDb.db)
    await seedAssignment(fixture.testDb.db)
    await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        userId: IDS.member,
        data: { stopped_by_user_id: IDS.outsider }
      })
    )
    const row = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.stoppedByUserId).toBe(IDS.member)
  })

  // SECURITY: stopped_at string is converted to Date
  it('update: converts stopped_at string to Date', async () => {
    await seedSession(fixture.testDb.db)
    await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        data: { stopped_at: '2026-01-15T14:00:00Z' }
      })
    )
    const row = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.stoppedAt).toBeInstanceOf(Date)
    expect(row!.stoppedAt!.toISOString()).toBe('2026-01-15T14:00:00.000Z')
  })

  it('update: handles null stopped_at', async () => {
    await seedSession(fixture.testDb.db)
    await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        data: { stopped_at: null }
      })
    )
    const row = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.stoppedAt).toBeNull()
  })

  it('rejects outsider update and leaves the session intact', async () => {
    await seedSession(fixture.testDb.db)
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        userId: IDS.outsider,
        data: { stopped_at: '2026-01-15T14:00:00Z' }
      })
    )
    expect(result.ok).toBe(false)

    const row = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.stoppedAt).toBeNull()
  })

  it('rejects outsider delete and leaves the session intact', async () => {
    await seedSession(fixture.testDb.db)
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.session,
        userId: IDS.outsider
      })
    )
    expect(result.ok).toBe(false)

    const row = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row).toBeDefined()
  })

  it("delete: admin can delete anyone's stopped session", async () => {
    await seedSession(fixture.testDb.db, IDS.member, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    const result = await handleGeneratorSessions(
      fixture.makeCtx({ op: 'delete', id: IDS.session })
    )
    expect(result.ok).toBe(true)
  })

  it('delete: non-admin can delete own stopped session', async () => {
    await seedSession(fixture.testDb.db, IDS.member, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    await seedAssignment(fixture.testDb.db)
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.session,
        userId: IDS.member
      })
    )
    expect(result.ok).toBe(true)
  })

  it("delete: non-admin cannot delete other's stopped session", async () => {
    await seedSession(fixture.testDb.db, IDS.admin, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    await seedAssignment(fixture.testDb.db)
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.session,
        userId: IDS.member
      })
    )
    expect(result.ok).toBe(false)
  })

  it('delete: rejects active session with CANNOT_DELETE_ACTIVE_SESSION', async () => {
    await seedSession(fixture.testDb.db)
    const result = await handleGeneratorSessions(
      fixture.makeCtx({ op: 'delete', id: IDS.session })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('CANNOT_DELETE_ACTIVE_SESSION')

    const row = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row).toBeDefined()
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleGeneratorSessions(
      fixture.makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  it('insert: second active session for same generator is rejected with GENERATOR_ALREADY_ACTIVE', async () => {
    await seedSession(fixture.testDb.db)
    const secondId = crypto.randomUUID()
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'insert',
        id: secondId,
        data: { generator_id: IDS.generator }
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('GENERATOR_ALREADY_ACTIVE')

    const rows = await fixture.testDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.generatorId, IDS.generator))
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(IDS.session)
  })

  it('insert: lost-ack replay of the same id by the same user returns ok', async () => {
    // PowerSync resends the same CRUD entry when a client never saw the
    // original upload ack. The replay must be treated as already-applied,
    // not recorded as a spurious GENERATOR_ALREADY_ACTIVE rejection.
    await seedSession(fixture.testDb.db)
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'insert',
        id: IDS.session,
        data: { generator_id: IDS.generator }
      })
    )
    expect(result.ok).toBe(true)

    const rows = await fixture.testDb.db
      .select()
      .from(generatorSessions)
      .where(eq(generatorSessions.generatorId, IDS.generator))
    expect(rows).toHaveLength(1)
    expect(rows[0].id).toBe(IDS.session)
  })

  it('update: rejects stopping an already-stopped session with SESSION_ALREADY_STOPPED', async () => {
    await seedSession(fixture.testDb.db, IDS.admin, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        data: { stopped_at: '2026-01-15T14:00:00Z' }
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('SESSION_ALREADY_STOPPED')
  })

  it('update: rejects editing an active session with CANNOT_EDIT_ACTIVE_SESSION', async () => {
    await seedSession(fixture.testDb.db)
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        data: {
          started_at: '2026-01-15T10:00:00Z',
          stopped_at: '2026-01-15T11:00:00Z'
        }
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('CANNOT_EDIT_ACTIVE_SESSION')
  })

  it('update: rejects editing a stopped session with START_BEFORE_END', async () => {
    await seedSession(fixture.testDb.db, IDS.admin, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        data: {
          started_at: '2026-01-15T11:00:00Z',
          stopped_at: '2026-01-15T11:00:00Z'
        }
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('START_BEFORE_END')
  })

  it('update: rejects editing a stopped session with END_TIME_IN_FUTURE', async () => {
    await seedSession(fixture.testDb.db, IDS.admin, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    const frozen = new Date('2026-01-15T12:00:00Z')
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        data: {
          started_at: '2026-01-15T10:00:00Z',
          stopped_at: '2026-01-15T14:00:00Z'
        },
        now: () => frozen
      })
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('END_TIME_IN_FUTURE')
  })

  it('update: rejects an unparseable time edit and leaves the row intact', async () => {
    await seedSession(fixture.testDb.db, IDS.admin, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    const before = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        data: {
          started_at: 'not-a-date',
          stopped_at: '2026-01-15T11:00:00Z'
        }
      })
    )
    expect(result.ok).toBe(false)
    const after = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(after!.startedAt).toEqual(before!.startedAt)
    expect(after!.stoppedAt).toEqual(before!.stoppedAt)
  })

  it('update: rejects an unparseable stopped_at on the stop branch', async () => {
    await seedSession(fixture.testDb.db)
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        data: { stopped_at: 'not-a-date', stopped_by_user_id: IDS.admin }
      })
    )
    expect(result.ok).toBe(false)
    const row = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.stoppedAt).toBeNull()
  })

  it('update: accepts editing a stopped session with valid times', async () => {
    await seedSession(fixture.testDb.db, IDS.admin, {
      stoppedAt: new Date('2026-01-15T13:00:00Z')
    })
    const result = await handleGeneratorSessions(
      fixture.makeCtx({
        op: 'update',
        id: IDS.session,
        data: {
          started_at: '2026-01-15T09:00:00Z',
          stopped_at: '2026-01-15T11:00:00Z'
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(row!.startedAt.toISOString()).toBe('2026-01-15T09:00:00.000Z')
    expect(row!.stoppedAt!.toISOString()).toBe('2026-01-15T11:00:00.000Z')
  })
})
