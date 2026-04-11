import { eq } from 'drizzle-orm'

import { generatorUserAssignments } from '@/data/server/db-schema'

import { handleGeneratorUserAssignments } from '../../handlers/assignments'
import { IDS, seedAssignment } from '../seed-server'
import { setupServerHandlersFixture } from './fixture'

const fixture = setupServerHandlersFixture()

describe('handleGeneratorUserAssignments', () => {
  it('insert: admin assigns', async () => {
    const newId = crypto.randomUUID()
    const result = await handleGeneratorUserAssignments(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        data: { generator_id: IDS.generator, user_id: IDS.member }
      })
    )
    expect(result.ok).toBe(true)
    const row =
      await fixture.testDb.db.query.generatorUserAssignments.findFirst({
        where: eq(generatorUserAssignments.id, newId)
      })
    expect(row).toBeDefined()
  })

  it('insert: duplicate assignment is idempotent (onConflictDoNothing)', async () => {
    await seedAssignment(fixture.testDb.db)
    const result = await handleGeneratorUserAssignments(
      fixture.makeCtx({
        op: 'insert',
        id: IDS.assignment,
        data: { generator_id: IDS.generator, user_id: IDS.member }
      })
    )
    expect(result.ok).toBe(true)
  })

  it('rejects non-admin insert and creates no assignment', async () => {
    const newId = crypto.randomUUID()
    const result = await handleGeneratorUserAssignments(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        userId: IDS.member,
        data: { generator_id: IDS.generator, user_id: IDS.member }
      })
    )
    expect(result.ok).toBe(false)

    const row =
      await fixture.testDb.db.query.generatorUserAssignments.findFirst({
        where: eq(generatorUserAssignments.id, newId)
      })
    expect(row).toBeUndefined()
  })

  it('delete: admin removes', async () => {
    await seedAssignment(fixture.testDb.db)
    const result = await handleGeneratorUserAssignments(
      fixture.makeCtx({ op: 'delete', id: IDS.assignment })
    )
    expect(result.ok).toBe(true)
    const row =
      await fixture.testDb.db.query.generatorUserAssignments.findFirst({
        where: eq(generatorUserAssignments.id, IDS.assignment)
      })
    expect(row).toBeUndefined()
  })

  it('rejects non-admin delete and leaves the assignment intact', async () => {
    await seedAssignment(fixture.testDb.db)
    const result = await handleGeneratorUserAssignments(
      fixture.makeCtx({
        op: 'delete',
        id: IDS.assignment,
        userId: IDS.member
      })
    )
    expect(result.ok).toBe(false)

    const row =
      await fixture.testDb.db.query.generatorUserAssignments.findFirst({
        where: eq(generatorUserAssignments.id, IDS.assignment)
      })
    expect(row).toBeDefined()
  })

  it('delete: already deleted returns ok', async () => {
    const result = await handleGeneratorUserAssignments(
      fixture.makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  it('invalid op (update) denied', async () => {
    const result = await handleGeneratorUserAssignments(
      fixture.makeCtx({ op: 'update' })
    )
    expect(result.ok).toBe(false)
  })
})
