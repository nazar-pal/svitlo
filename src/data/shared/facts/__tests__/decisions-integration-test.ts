import { runDecisionAsync } from '@/data/shared/facts/async-adapter'
import {
  IDS,
  seedActiveSession,
  seedBaseScenario,
  seedGenerator,
  seedStoppedSession
} from '@/data/client/mutations/__tests__/seed'
import {
  closeDatabase,
  createTestDatabase,
  resetDatabase
} from '@/data/client/mutations/__tests__/test-db'
import { clientLookup } from '@/data/client/registry'
import {
  deleteSession,
  startSession,
  stopSession
} from '@/data/shared/sessions/decisions'

let testDb: Awaited<ReturnType<typeof createTestDatabase>>

beforeAll(async () => {
  testDb = await createTestDatabase()
})

beforeEach(() => {
  resetDatabase(testDb.sqlite)
})

afterAll(() => {
  closeDatabase(testDb.sqlite)
})

// Smoke-check the async adapter end-to-end: decisions drive the plan, the
// client registry's builder+project fulfils each fact, the rule runs, and
// the adapter tags `facts` onto both branches. If this passes, the wiring
// spine for every sessions rule is sound.

describe('sessions decisions (async adapter)', () => {
  it('startSession: happy path for admin attaches facts on success', async () => {
    seedBaseScenario(testDb.db)
    seedGenerator(testDb.db)
    const result = await runDecisionAsync(
      startSession,
      { userId: IDS.adminUser, generatorId: IDS.generator },
      clientLookup(testDb.db)
    )
    expect(result.ok).toBe(true)
    expect(result.facts.generator).toEqual({ id: IDS.generator })
    expect(result.facts.openSession).toBe(false)
  })

  it('startSession: outsider rejected with NOT_AUTHORIZED_FOR_GENERATOR', async () => {
    seedBaseScenario(testDb.db)
    seedGenerator(testDb.db)
    const result = await runDecisionAsync(
      startSession,
      { userId: IDS.outsiderUser, generatorId: IDS.generator },
      clientLookup(testDb.db)
    )
    expect(result).toMatchObject({
      ok: false,
      code: 'NOT_AUTHORIZED_FOR_GENERATOR'
    })
  })

  it('startSession: short-circuits on missing generator without authz lookup', async () => {
    seedBaseScenario(testDb.db)
    const result = await runDecisionAsync(
      startSession,
      { userId: IDS.adminUser, generatorId: IDS.generator },
      clientLookup(testDb.db)
    )
    expect(result).toMatchObject({ ok: false, code: 'GENERATOR_NOT_FOUND' })
  })

  it('stopSession: surfaces resolved session in facts on success', async () => {
    seedBaseScenario(testDb.db)
    seedGenerator(testDb.db)
    seedActiveSession(testDb.db)
    const result = await runDecisionAsync(
      stopSession,
      { userId: IDS.adminUser, sessionId: IDS.session.active },
      clientLookup(testDb.db)
    )
    expect(result.ok).toBe(true)
    expect(result.facts.session).toMatchObject({ isStopped: false })
  })

  it('stopSession: denies when the session outlives a deleted generator', async () => {
    // Session exists but its generator row is gone (seedGenerator omitted), so
    // the conditional `authz.generator` plan entry resolves to a null fact.
    // `canAccessGeneratorFact(user, null)` must deny — even for the org admin,
    // who would otherwise be allowed — because access derives from the fact
    // row, not ambient admin status. Exercises the null-fact branch of the
    // shared helper end-to-end through the async adapter.
    seedBaseScenario(testDb.db)
    seedActiveSession(testDb.db)
    const result = await runDecisionAsync(
      stopSession,
      { userId: IDS.adminUser, sessionId: IDS.session.active },
      clientLookup(testDb.db)
    )
    expect(result).toMatchObject({
      ok: false,
      code: 'NOT_AUTHORIZED_FOR_GENERATOR'
    })
    expect(result.facts.authzGenerator).toBeNull()
  })

  it('deleteSession: surfaces session on success for defence-in-depth', async () => {
    seedBaseScenario(testDb.db)
    seedGenerator(testDb.db)
    seedStoppedSession(testDb.db)

    const result = await runDecisionAsync(
      deleteSession,
      { userId: IDS.adminUser, sessionId: IDS.session.stopped },
      clientLookup(testDb.db)
    )
    expect(result.ok).toBe(true)
    expect(result.facts.session).toMatchObject({
      generatorId: IDS.generator,
      isStopped: true
    })
  })
})
