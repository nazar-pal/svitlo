import { eq } from 'drizzle-orm'

import {
  generators,
  generatorSessions,
  generatorUserAssignments,
  maintenanceTemplates
} from '@/data/server/db-schema'

import { handleGenerators } from '../../handlers/generators'
import { IDS, seedAssignment, seedSession, seedTemplate } from '../seed-server'
import { setupServerHandlersFixture } from './fixture'

const fixture = setupServerHandlersFixture()

// Authz branches (admin vs. non-admin) and field-level validation are covered
// by `src/data/shared/generators/__tests__/policy-test.ts` and the shared
// `checks-test.ts`. The tests below focus on what's unique to the server
// handler: SQL-write verification, the Zod whitelist regression, and the
// replay-handling edge case for delete.

describe('handleGenerators', () => {
  it('insert: admin creates', async () => {
    const newId = crypto.randomUUID()
    const result = await handleGenerators(
      fixture.makeCtx({
        op: 'insert',
        id: newId,
        data: {
          organization_id: IDS.org,
          title: 'New Gen',
          model: 'Honda',
          max_consecutive_run_hours: '8',
          required_rest_hours: '4',
          run_warning_threshold_pct: '80'
        }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.generators.findFirst({
      where: eq(generators.id, newId)
    })
    expect(row!.title).toBe('New Gen')
  })

  it('update: admin updates', async () => {
    const result = await handleGenerators(
      fixture.makeCtx({
        op: 'update',
        id: IDS.generator,
        data: { title: 'Updated Gen' }
      })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.generators.findFirst({
      where: eq(generators.id, IDS.generator)
    })
    expect(row!.title).toBe('Updated Gen')
  })

  // Regression guard for the Zod whitelist: a compromised client that sends
  // a known column outside the update schema (here: `organization_id` and
  // `created_at`) must not be able to mutate that column. The schema strips
  // unknown keys, so only `title` should land in Postgres.
  it('update: ignores fields outside the schema whitelist', async () => {
    const result = await handleGenerators(
      fixture.makeCtx({
        op: 'update',
        id: IDS.generator,
        data: {
          title: 'Whitelisted',
          organization_id: 'attacker-org',
          created_at: '1970-01-01T00:00:00.000Z'
        }
      })
    )
    expect(result.ok).toBe(true)

    const row = await fixture.testDb.db.query.generators.findFirst({
      where: eq(generators.id, IDS.generator)
    })
    expect(row!.title).toBe('Whitelisted')
    expect(row!.organizationId).toBe(IDS.org)
  })

  it('delete: admin deletes', async () => {
    const result = await handleGenerators(
      fixture.makeCtx({ op: 'delete', id: IDS.generator })
    )
    expect(result.ok).toBe(true)
    const row = await fixture.testDb.db.query.generators.findFirst({
      where: eq(generators.id, IDS.generator)
    })
    expect(row).toBeUndefined()
  })

  // PowerSync replay: if the ack for a successful delete was lost, the
  // retry hits a missing row. The server must translate that into success
  // so the sync queue advances instead of logging a spurious rejection.
  it('delete: replay of already-deleted row returns ok', async () => {
    const result = await handleGenerators(
      fixture.makeCtx({ op: 'delete', id: crypto.randomUUID() })
    )
    expect(result.ok).toBe(true)
  })

  it('delete: cascades to sessions, templates, and assignments', async () => {
    await seedAssignment(fixture.testDb.db)
    await seedSession(fixture.testDb.db)
    await seedTemplate(fixture.testDb.db)

    const result = await handleGenerators(
      fixture.makeCtx({ op: 'delete', id: IDS.generator })
    )
    expect(result.ok).toBe(true)

    const assignment =
      await fixture.testDb.db.query.generatorUserAssignments.findFirst({
        where: eq(generatorUserAssignments.id, IDS.assignment)
      })
    expect(assignment).toBeUndefined()

    const session = await fixture.testDb.db.query.generatorSessions.findFirst({
      where: eq(generatorSessions.id, IDS.session)
    })
    expect(session).toBeUndefined()

    const template =
      await fixture.testDb.db.query.maintenanceTemplates.findFirst({
        where: eq(maintenanceTemplates.id, IDS.template)
      })
    expect(template).toBeUndefined()
  })
})
